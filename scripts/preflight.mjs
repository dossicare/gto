#!/usr/bin/env node
// Pre-flight check: loads the export into an in-memory Postgres with the real schema and checks the
// public views. Run it before the import:  node scripts/preflight.mjs
// Local only: nothing is sent anywhere and nothing is written to disk.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlan } from "./import-lib.mjs";
import { freshDatabase, loadPlan } from "./preflight-lib.mjs";

const web = fileURLToPath(new URL("..", import.meta.url));
const dir = path.resolve(process.argv[2] ?? path.join(web, "migration-export"));

const plan = buildPlan(dir);
if (plan.problems.length) {
  console.error("The export has problems:\n  - " + plan.problems.join("\n  - "));
  process.exit(1);
}

const db = await freshDatabase();
const inserted = await loadPlan(db, plan);

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
  if (!ok) failures++;
};

for (const s of plan.steps) {
  check(`${s.table}: all ${s.rows.length} rows fit the schema`, inserted[s.table] === s.rows.length, `inserted ${inserted[s.table]}`);
}

// Independent expectations computed in JS from the export, compared with what the SQL views return.
const rowsOf = (t) => plan.steps.find((s) => s.table === t).rows;
const expectedOffers = rowsOf("offers").filter((o) => !o.payload.deleted && !o.payload.fictional).length;
const expectedTemplates = rowsOf("gto_templates").filter((t) => !t.deleted).length;
const count = async (sql) => Number((await db.query(sql)).rows[0].n);

await db.exec("set role anon");
check("public_offers shows only non-deleted, non-fictional offers", (await count("select count(*) n from public.public_offers")) === expectedOffers, `expected ${expectedOffers}`);
check("public_templates shows every live template", (await count("select count(*) n from public.public_templates")) === expectedTemplates, `expected ${expectedTemplates}`);
check("public_official_terms shows exactly the newest snapshot", (await count("select count(*) n from public.public_official_terms")) === (rowsOf("official_terms_snapshots").length ? 1 : 0));
let blocked = false;
try {
  await db.query("select * from public.offers limit 1");
} catch {
  blocked = true;
}
check("a visitor cannot read the offers table directly", blocked);
await db.exec("reset role");

console.log(failures === 0 ? "\nPre-flight passed: the data fits the schema." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
