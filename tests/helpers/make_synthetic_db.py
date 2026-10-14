"""Creates a pair of FICTIONAL offers.db / operations.db (same layout as the old app) for the migration test."""
import hashlib, json, sqlite3, sys
from pathlib import Path

folder = Path(sys.argv[1])
folder.mkdir(parents=True, exist_ok=True)
DOCX = b"PK\x03\x04 fictional word document bytes"
PDF = b"%PDF-1.4 fictional pdf bytes"
sha = lambda b: hashlib.sha256(b).hexdigest()
STAMP = "2026-10-01T09:00:00.000000+03:00"
j = lambda o: json.dumps(o, ensure_ascii=False)

LEGACY = """CREATE TABLE records (id INTEGER PRIMARY KEY, section TEXT NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL DEFAULT '',
  keywords TEXT NOT NULL DEFAULT '', content TEXT NOT NULL, source TEXT NOT NULL, version TEXT NOT NULL, status TEXT NOT NULL,
  review_due TEXT NOT NULL DEFAULT '', fictional INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT '', captured_at TEXT NOT NULL DEFAULT '', source_locator TEXT NOT NULL DEFAULT '', source_hash TEXT NOT NULL DEFAULT '');
CREATE TABLE audit (id INTEGER PRIMARY KEY, record_id INTEGER, action TEXT, timestamp TEXT);"""

def offer(oid, **kw):
    base = dict(offer_id=oid, name="Fictional " + oid, category="Products", deleted=False, fictional=False, lifecycle="available",
                approval_status="draft", revision=1, updated_at=STAMP, attachment_ids=[])
    base.update(kw)
    return base

o = sqlite3.connect(folder / "offers.db")
o.executescript("""
CREATE TABLE offer_items (offer_id TEXT PRIMARY KEY COLLATE NOCASE, revision INTEGER NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE offer_versions (offer_id TEXT NOT NULL COLLATE NOCASE, revision INTEGER NOT NULL, payload TEXT NOT NULL, saved_at TEXT NOT NULL, action TEXT NOT NULL, PRIMARY KEY(offer_id,revision));
CREATE TABLE offer_documents (document_id INTEGER PRIMARY KEY, offer_id TEXT NOT NULL COLLATE NOCASE, filename TEXT NOT NULL, media_type TEXT NOT NULL, source_version TEXT NOT NULL, sha256 TEXT NOT NULL, size INTEGER NOT NULL, approved INTEGER NOT NULL, uploaded_at TEXT NOT NULL, data BLOB NOT NULL);
CREATE TABLE offer_import_batches (digest TEXT PRIMARY KEY);
CREATE TABLE offer_migrations (name TEXT PRIMARY KEY, completed_at TEXT NOT NULL);
""" + LEGACY)
current = [offer("FIX-A", revision=2, name="Renamed"), offer("FIX-B", deleted=True), offer("FIX-C", fictional=True)]
for it in current:
    o.execute("INSERT INTO offer_items VALUES (?,?,?,?)", (it["offer_id"], it["revision"], j(it), STAMP))
for it in current:
    for rev in range(1, it["revision"] + 1):
        o.execute("INSERT INTO offer_versions VALUES (?,?,?,?,?)", (it["offer_id"], rev, j(dict(it, revision=rev)), STAMP, "save"))
o.execute("INSERT INTO offer_documents VALUES (1,'FIX-A','sheet.pdf','application/pdf','v1',?,?,1,?,?)", (sha(PDF), len(PDF), STAMP, PDF))
o.execute("INSERT INTO offer_import_batches VALUES ('digest-1')")
o.execute("INSERT INTO offer_migrations VALUES ('legacy-v1', ?)", (STAMP,))
o.execute("INSERT INTO records (id,section,title,content,source,version,status,updated_at) VALUES (1,'Offers Database','Legacy','Text','sample:training-only','demo-1','draft',?)", (STAMP,))
o.execute("INSERT INTO audit VALUES (1,1,'save',?)", (STAMP,))
o.commit(); o.close()

def template(tid, title, **kw):
    p = dict(template_id=tid, revision=1, title=title, category="Wallet", path="Wallet / " + title, start=10, source="Fictional.docx",
             sha256=sha(DOCX), paragraphs=[{"number": 10, "text": "p"}],
             blocks=[{"kind": "English", "paragraphs": [{"number": 11, "text": "Hello"}]}, {"kind": "Arabic", "paragraphs": [{"number": 12, "text": "مرحبا"}]}])
    p.update(kw)
    return p

p = sqlite3.connect(folder / "operations.db")
p.executescript("""
CREATE TABLE gto_templates(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
CREATE TABLE gto_template_history(id TEXT, revision INTEGER, payload TEXT, PRIMARY KEY(id,revision));
CREATE TABLE gto_template_sources(sha256 TEXT PRIMARY KEY, filename TEXT, data BLOB);
CREATE TABLE official_terms_snapshots (revision INTEGER PRIMARY KEY, source_url TEXT NOT NULL, fetched_at TEXT NOT NULL, sha256 TEXT NOT NULL, html TEXT NOT NULL);
CREATE TABLE operation_items(record_id TEXT PRIMARY KEY COLLATE NOCASE, revision INTEGER NOT NULL, payload TEXT NOT NULL);
CREATE TABLE operation_versions(record_id TEXT NOT NULL COLLATE NOCASE, revision INTEGER NOT NULL, payload TEXT NOT NULL, action TEXT NOT NULL, PRIMARY KEY(record_id,revision));
CREATE TABLE operation_documents(document_id INTEGER PRIMARY KEY, filename TEXT NOT NULL, version TEXT NOT NULL, sha256 TEXT NOT NULL UNIQUE, media_type TEXT NOT NULL, data BLOB NOT NULL);
CREATE TABLE operation_imports(import_key TEXT PRIMARY KEY);
""" + LEGACY)
for t in (template("TPL-1", "One"), template("TPL-2", "Two", start=20)):
    p.execute("INSERT INTO gto_templates VALUES (?,?)", (t["template_id"], j(t)))
    p.execute("INSERT INTO gto_template_history VALUES (?,?,?)", (t["template_id"], 1, j(t)))
p.execute("INSERT INTO gto_template_sources VALUES (?,?,?)", (sha(DOCX), "Fictional.docx", DOCX))
p.execute("INSERT INTO operation_documents VALUES (1,'Fictional.pdf','v1',?, 'application/pdf', ?)", (sha(PDF + b"2"), PDF + b"2"))
html = "<h2>Fictional terms</h2>"
p.execute("INSERT INTO official_terms_snapshots VALUES (1,'https://example.test',?,?,?)", (STAMP, sha(html.encode()), html))
item = dict(record_id="OPS-1", revision=1, title="Fictional", module="General Rules", document_ids=[1])
p.execute("INSERT INTO operation_items VALUES (?,?,?)", ("OPS-1", 1, j(item)))
p.execute("INSERT INTO operation_versions VALUES (?,?,?,?)", ("OPS-1", 1, j(item), "legacy import"))
p.execute("INSERT INTO operation_imports VALUES ('legacy-v1')")
p.execute("INSERT INTO records (id,section,title,content,source,version,status,updated_at,fictional) VALUES (1,'Calculations','Legacy ops','Text','sample:training-only','demo-1','draft',?,1)", (STAMP,))
p.execute("INSERT INTO audit VALUES (1,1,'save',?)", (STAMP,))
p.commit(); p.close()
print("ok")
