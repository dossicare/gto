#!/usr/bin/env node
// One-off import of the exported data into Supabase. Run it on YOUR computer, deliberately.
//
//   node scripts/import_supabase.mjs                       # dry run: checks the export, writes nothing
//   node scripts/import_supabase.mjs --apply --confirm-host <your-project-ref>.supabase.co
//
// Safety:
//   * Dry run by default. Uploading private data needs --apply AND --confirm-host matching the URL.
//   * Only INSERTS rows that are missing. Existing rows are never overwritten, so it is safe to
//     re-run and it will never undo edits you made later.
//   * Uses the service-role key from the environment (or .env.local). That key bypasses all access
//     rules: keep it on this computer only, never in Vercel, never in a commit.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { buildPlan } from "./import-lib.mjs";

const web = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

const dir = path.resolve(option("--dir") ?? path.join(web, "migration-export"));
const apply = flag("--apply");

try {
  process.loadEnvFile(path.join(web, ".env.local"));
} catch {
  /* no .env.local: environment variables only */
}

const plan = buildPlan(dir);
console.log(`Export: ${dir}  (created ${plan.manifest.created_at})`);
for (const s of plan.steps) console.log(`  ${s.table.padEnd(26)} ${String(s.rows.length).padStart(5)} rows`);
console.log(`  ${"documents to upload".padEnd(26)} ${String(plan.uploads.length).padStart(5)} file(s)`);

if (plan.problems.length) {
  console.error("\nThe export has problems; nothing was sent:");
  for (const p of plan.problems) console.error("  - " + p);
  process.exit(1);
}
console.log("\nExport checks passed (counts, unique keys, revisions, document checksums).");

if (!apply) {
  console.log("Dry run only. Nothing was sent. To import, add: --apply --confirm-host <your-project-ref>.supabase.co");
  process.exit(0);
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}
const host = new URL(url).host;
if (option("--confirm-host") !== host) {
  console.error(`Refusing to send data: --confirm-host must be exactly "${host}" (the project in your URL).`);
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
console.log(`\nImporting into ${host} ...`);

for (const { table, key: conflictKey, rows } of plan.steps) {
  let done = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    // defaultToNull: false -> a column the export leaves out takes its database default, not NULL.
    const { error } = await db
      .from(table)
      .upsert(batch, { onConflict: conflictKey.join(","), ignoreDuplicates: true, defaultToNull: false });
    if (error) {
      console.error(`\n${table}: ${error.message}`);
      console.error("Stopped. Fix the cause and run the same command again: rows already inserted are skipped.");
      process.exit(1);
    }
    done += batch.length;
  }
  console.log(`  ${table.padEnd(26)} ${done} row(s) processed`);
}

for (const u of plan.uploads) {
  const { error } = await db.storage.from("source-documents").upload(u.storagePath, readFileSync(u.file), {
    contentType: u.contentType,
    upsert: false,
  });
  if (error && !/already exists|Duplicate/i.test(error.message)) {
    console.error(`\nUpload of ${u.filename} failed: ${error.message}`);
    console.error("Did you run supabase/migrations/20261014000002_storage.sql (it creates the private bucket)?");
    process.exit(1);
  }
  console.log(`  document ${u.filename}: ${error ? "already there" : "uploaded"}`);
}

console.log("\nVerifying row counts ...");
let bad = 0;
for (const s of plan.steps) {
  const { count, error } = await db.from(s.table).select("*", { count: "exact", head: true });
  const ok = !error && count >= s.rows.length;
  if (!ok) bad++;
  console.log(`  ${ok ? "OK  " : "FAIL"} ${s.table.padEnd(26)} database has ${count ?? "?"}, expected at least ${s.rows.length}`);
}
if (plan.steps.find((s) => s.table === "offer_documents")?.rows.length) {
  console.log("\nNote: offer_documents were imported with their original IDs. Run this once in the SQL editor so new IDs do not collide:");
  console.log("  select setval(pg_get_serial_sequence('public.offer_documents','document_id'), (select max(document_id) from public.offer_documents));");
}
console.log(bad === 0 ? "\nImport complete." : `\n${bad} table(s) did not verify. Do not rely on the data until this is resolved.`);
process.exit(bad === 0 ? 0 : 1);
