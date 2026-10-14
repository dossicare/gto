#!/usr/bin/env python3
"""Export offers.db and operations.db to JSON files for the Supabase import. Standard library only.

  python scripts/export_sqlite.py [--data-dir ../data] [--out migration-export]

* Both databases are opened READ-ONLY; nothing in them is changed.
* The output folder holds private business data. It is git-ignored; never commit or share it.
* Nothing is sent anywhere. Uploading is a separate, explicit step (scripts/import_supabase.mjs).
"""
import argparse
import hashlib
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

WEB = Path(__file__).resolve().parents[1]
DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
EXT = {
    "application/pdf": "pdf",
    DOCX: "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "text/csv": "csv",
}


def open_readonly(path: Path) -> sqlite3.Connection:
    if not path.is_file():
        sys.exit(f"Database not found: {path}")
    conn = sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def has_table(conn: sqlite3.Connection, name: str) -> bool:
    return conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)).fetchone() is not None


def rows(conn: sqlite3.Connection, name: str, order: str) -> list[sqlite3.Row]:
    if not has_table(conn, name):
        return []
    return conn.execute(f"SELECT * FROM {name} ORDER BY {order}").fetchall()  # names are constants below


def parse(payload: str, where: str) -> dict:
    try:
        value = json.loads(payload)
    except json.JSONDecodeError as error:
        sys.exit(f"Invalid JSON in {where}: {error}")
    if not isinstance(value, dict):
        sys.exit(f"Expected a JSON object in {where}")
    return value


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data-dir", type=Path, default=WEB.parent / "data")
    parser.add_argument("--out", type=Path, default=WEB / "migration-export")
    args = parser.parse_args()

    offers_db_path = args.data_dir / "offers.db"
    ops_db_path = args.data_dir / "operations.db"
    offers = open_readonly(offers_db_path)
    ops = open_readonly(ops_db_path)

    out: Path = args.out
    blobs = out / "blobs"
    blobs.mkdir(parents=True, exist_ok=True)

    tables: dict[str, list[dict]] = {}

    # --- Offers -----------------------------------------------------------------------------------
    tables["offers"] = [
        dict(offer_id=r["offer_id"], revision=r["revision"], payload=parse(r["payload"], f"offer {r['offer_id']}"),
             updated_at=r["updated_at"])
        for r in rows(offers, "offer_items", "offer_id")
    ]
    tables["offer_versions"] = [
        dict(offer_id=r["offer_id"], revision=r["revision"], payload=parse(r["payload"], f"offer {r['offer_id']} v{r['revision']}"),
             saved_at=r["saved_at"], action=r["action"])
        for r in rows(offers, "offer_versions", "offer_id, revision")
    ]

    def save_blob(data: bytes, media_type: str) -> tuple[str, str, int]:
        digest = hashlib.sha256(data).hexdigest()
        name = f"{digest}.{EXT.get(media_type, 'bin')}"
        (blobs / name).write_bytes(data)
        return digest, f"documents/{name}", len(data)

    offer_docs = []
    for r in rows(offers, "offer_documents", "document_id"):
        digest, path, size = save_blob(bytes(r["data"]), r["media_type"])
        if digest != r["sha256"]:
            sys.exit(f"Checksum mismatch for offer document {r['document_id']}")
        offer_docs.append(dict(document_id=r["document_id"], offer_id=r["offer_id"], filename=r["filename"],
                               media_type=r["media_type"], source_version=r["source_version"], sha256=digest, size=size,
                               approved=bool(r["approved"]), uploaded_at=r["uploaded_at"], storage_path=path))
    tables["offer_documents"] = offer_docs
    tables["offer_import_batches"] = [dict(digest=r["digest"]) for r in rows(offers, "offer_import_batches", "digest")]
    tables["offer_migrations"] = [dict(name=r["name"], completed_at=r["completed_at"]) for r in rows(offers, "offer_migrations", "name")]

    # --- Templates ----------------------------------------------------------------------------------
    tables["gto_templates"] = [
        dict(template_id=r["id"], revision=(p := parse(r["payload"], f"template {r['id']}"))["revision"], payload=p, deleted=False)
        for r in rows(ops, "gto_templates", "id")
    ]
    tables["gto_template_history"] = [
        dict(template_id=r["id"], revision=r["revision"], payload=parse(r["payload"], f"template {r['id']} v{r['revision']}"),
             action="source import" if r["revision"] == 1 else "save")
        for r in rows(ops, "gto_template_history", "id, revision")
    ]

    # --- Original documents (binary files go to blobs/, rows keep only metadata) ----------------------
    source_docs = []
    for r in rows(ops, "gto_template_sources", "filename"):
        digest, path, size = save_blob(bytes(r["data"]), DOCX)
        if digest != r["sha256"]:
            sys.exit(f"Checksum mismatch for template source {r['filename']}")
        source_docs.append(dict(origin="gto_template_sources", legacy_id=None, filename=r["filename"], version="",
                                media_type=DOCX, sha256=digest, size=size, storage_path=path))
    for r in rows(ops, "operation_documents", "document_id"):
        digest, path, size = save_blob(bytes(r["data"]), r["media_type"])
        if digest != r["sha256"]:
            sys.exit(f"Checksum mismatch for operation document {r['document_id']}")
        source_docs.append(dict(origin="operation_documents", legacy_id=r["document_id"], filename=r["filename"],
                                version=r["version"], media_type=r["media_type"], sha256=digest, size=size, storage_path=path))
    tables["source_documents"] = source_docs

    # --- General terms ---------------------------------------------------------------------------------
    tables["official_terms_snapshots"] = [
        dict(revision=r["revision"], source_url=r["source_url"], fetched_at=r["fetched_at"], sha256=r["sha256"], html=r["html"])
        for r in rows(ops, "official_terms_snapshots", "revision")
    ]

    # --- Retained data from sections that are no longer in the interface ---------------------------
    tables["operation_items"] = [
        dict(record_id=r["record_id"], revision=r["revision"], payload=parse(r["payload"], f"operation {r['record_id']}"))
        for r in rows(ops, "operation_items", "record_id")
    ]
    tables["operation_versions"] = [
        dict(record_id=r["record_id"], revision=r["revision"], payload=parse(r["payload"], f"operation {r['record_id']} v{r['revision']}"),
             action=r["action"])
        for r in rows(ops, "operation_versions", "record_id, revision")
    ]
    tables["operation_imports"] = [dict(import_key=r["import_key"]) for r in rows(ops, "operation_imports", "import_key")]

    legacy, audit = [], []
    for label, conn in (("offers", offers), ("operations", ops)):
        for r in rows(conn, "records", "id"):
            legacy.append(dict(db=label, **{k: r[k] for k in r.keys()}))
        for r in rows(conn, "audit", "id"):
            audit.append(dict(db=label, id=r["id"], record_id=r["record_id"], action=r["action"], timestamp=r["timestamp"]))
    tables["legacy_records"] = legacy
    tables["legacy_audit"] = audit

    # --- Write ------------------------------------------------------------------------------------------
    counts = {}
    for name, data in tables.items():
        (out / f"{name}.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        counts[name] = len(data)

    def fingerprint(path: Path) -> dict:
        return dict(file=path.name, bytes=path.stat().st_size, sha256=hashlib.sha256(path.read_bytes()).hexdigest())

    manifest = dict(
        created_at=datetime.now(timezone.utc).isoformat(),
        note="Private business data. Git-ignored. Do not share.",
        source_databases=[fingerprint(offers_db_path), fingerprint(ops_db_path)],
        counts=counts,
        blobs=sorted(p.name for p in blobs.iterdir()),
    )
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    offers.close()
    ops.close()
    width = max(len(n) for n in counts)
    print(f"Exported to {out}")
    for name, n in counts.items():
        print(f"  {name:<{width}}  {n}")
    print(f"  blobs: {len(manifest['blobs'])} file(s)")


if __name__ == "__main__":
    main()
