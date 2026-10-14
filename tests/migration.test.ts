/**
 * End-to-end check of the data migration pipeline on FICTIONAL data (never the real databases):
 * synthetic SQLite files -> python exporter -> import plan -> real schema in an in-memory Postgres.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildPlan } from "../scripts/import-lib.mjs";
import { freshDatabase, loadPlan } from "../scripts/preflight-lib.mjs";

const here = path.resolve(import.meta.dirname);

function findPython(): string | null {
  for (const candidate of [process.env.PYTHON, "python", "python3", "py"].filter(Boolean) as string[]) {
    const probe = spawnSync(candidate, ["-c", "print(40+2)"], { encoding: "utf8" });
    if (probe.status === 0 && probe.stdout.trim() === "42") return candidate;
  }
  return null;
}

const python = findPython();
const work = mkdtempSync(path.join(tmpdir(), "sk-migration-"));
const dataDir = path.join(work, "data");
const exportDir = path.join(work, "export");

type Plan = { problems: string[]; steps: { table: string; rows: Record<string, unknown>[] }[]; manifest: { counts: Record<string, number> } };

beforeAll(() => {
  if (!python) return;
  execFileSync(python, ["-I", path.join(here, "helpers/make_synthetic_db.py"), dataDir], { stdio: "pipe" });
  execFileSync(python, ["-I", path.join(here, "../scripts/export_sqlite.py"), "--data-dir", dataDir, "--out", exportDir], { stdio: "pipe" });
});
afterAll(() => rmSync(work, { recursive: true, force: true }));

describe.skipIf(!python)("migration pipeline (fictional data)", () => {
  it("exports every table with the expected counts", () => {
    const plan = buildPlan(exportDir) as Plan;
    expect(plan.problems).toEqual([]);
    expect(plan.manifest.counts).toMatchObject({
      offers: 3, offer_versions: 4, offer_documents: 1, gto_templates: 2, gto_template_history: 2,
      source_documents: 2, official_terms_snapshots: 1, operation_items: 1, operation_versions: 1,
      operation_imports: 1, legacy_records: 2, legacy_audit: 2,
    });
    expect(readdirSync(path.join(exportDir, "blobs")).length).toBe(3);
  });

  it("fits the real schema, and re-running inserts nothing (never overwrites)", async () => {
    const plan = buildPlan(exportDir) as Plan;
    const db = await freshDatabase();
    const first = (await loadPlan(db, plan)) as Record<string, number | string>;
    for (const s of plan.steps) expect(first[s.table], s.table).toBe(s.rows.length);
    const second = (await loadPlan(db, plan)) as Record<string, number | string>;
    for (const s of plan.steps) expect(second[s.table], s.table).toBe(0);
  });

  it("the public views expose only what visitors should see", async () => {
    const plan = buildPlan(exportDir) as Plan;
    const db = await freshDatabase();
    await loadPlan(db, plan);
    await db.exec("set role anon");
    const offers = (await db.query<{ offer_id: string; name: string }>("select offer_id, name from public.public_offers")).rows;
    expect(offers).toEqual([{ offer_id: "FIX-A", name: "Renamed" }]); // FIX-B deleted, FIX-C fictional
    expect((await db.query("select 1 from public.public_templates")).rows).toHaveLength(2);
    expect((await db.query("select 1 from public.public_official_terms")).rows).toHaveLength(1);
    await expect(db.query("select * from public.operation_items")).rejects.toThrow(/permission denied/i);
    await expect(db.query("select * from public.legacy_records")).rejects.toThrow(/permission denied/i);
  });

  it("refuses a tampered or incomplete export", () => {
    const blob = readdirSync(path.join(exportDir, "blobs"))[0];
    writeFileSync(path.join(exportDir, "blobs", blob), "tampered");
    const plan = buildPlan(exportDir) as Plan;
    expect(plan.problems.join("\n")).toMatch(/Checksum mismatch/);
    expect(() => buildPlan(path.join(work, "nowhere"))).toThrow(/No export found/);
  });
});
