// Pure helpers for the Supabase import: read the export, validate it, and describe what to insert.
// No network access in this file. See import_supabase.mjs for the command-line tool.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** Insert order and the unique key of each table. Existing rows are never overwritten. */
export const TABLES = [
  { name: "offers", key: ["offer_id"] },
  { name: "offer_versions", key: ["offer_id", "revision"] },
  { name: "offer_documents", key: ["document_id"] },
  { name: "offer_import_batches", key: ["digest"] },
  { name: "offer_migrations", key: ["name"] },
  { name: "gto_templates", key: ["template_id"] },
  { name: "gto_template_history", key: ["template_id", "revision"] },
  { name: "source_documents", key: ["sha256"] },
  { name: "official_terms_snapshots", key: ["revision"] },
  { name: "operation_items", key: ["record_id"] },
  { name: "operation_versions", key: ["record_id", "revision"] },
  { name: "operation_imports", key: ["import_key"] },
  { name: "legacy_records", key: ["db", "id"] },
  { name: "legacy_audit", key: ["db", "id"] },
];

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

export function buildPlan(dir) {
  const manifestFile = path.join(dir, "manifest.json");
  if (!existsSync(manifestFile)) {
    throw new Error(`No export found in ${dir}. Run: python scripts/export_sqlite.py`);
  }
  const manifest = readJson(manifestFile);
  const problems = [];
  const steps = [];

  for (const { name, key } of TABLES) {
    const file = path.join(dir, `${name}.json`);
    if (!existsSync(file)) {
      problems.push(`Missing ${name}.json`);
      continue;
    }
    const rows = readJson(file);
    if (!Array.isArray(rows)) problems.push(`${name}.json is not a list`);
    else {
      if (rows.length !== manifest.counts[name]) problems.push(`${name}: ${rows.length} rows, manifest says ${manifest.counts[name]}`);
      const seen = new Set();
      for (const row of rows) {
        const id = key.map((k) => String(row[k]).toLowerCase()).join("\u0000");
        if (key.some((k) => row[k] === undefined || row[k] === null)) problems.push(`${name}: a row has no ${key.join("/")}`);
        else if (seen.has(id)) problems.push(`${name}: duplicate key ${id.replace("\u0000", "/")}`);
        seen.add(id);
      }
    }
    steps.push({ table: name, key, rows });
  }

  // Every revision must belong to a current record (nothing orphaned).
  const byTable = Object.fromEntries(steps.map((s) => [s.table, s.rows]));
  const offerIds = new Set((byTable.offers ?? []).map((r) => r.offer_id.toLowerCase()));
  for (const v of byTable.offer_versions ?? []) {
    if (!offerIds.has(v.offer_id.toLowerCase())) problems.push(`offer_versions: ${v.offer_id} has no current record`);
  }
  const templateIds = new Set((byTable.gto_templates ?? []).map((r) => r.template_id));
  for (const h of byTable.gto_template_history ?? []) {
    if (!templateIds.has(h.template_id)) problems.push(`gto_template_history: ${h.template_id} has no current record`);
  }

  // Original documents: file present and checksum intact.
  const uploads = [];
  for (const d of [...(byTable.source_documents ?? []), ...(byTable.offer_documents ?? [])]) {
    if (!d.storage_path) continue;
    const file = path.join(dir, "blobs", path.basename(d.storage_path));
    if (!existsSync(file)) {
      problems.push(`Missing document file for ${d.filename}`);
      continue;
    }
    const digest = createHash("sha256").update(readFileSync(file)).digest("hex");
    if (digest !== d.sha256) problems.push(`Checksum mismatch for ${d.filename}`);
    uploads.push({ storagePath: d.storage_path, file, contentType: d.media_type, filename: d.filename });
  }

  return { manifest, steps, uploads, problems };
}
