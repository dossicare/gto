/**
 * Runs the real migration against an in-process Postgres (PGlite) and checks the access model:
 * what anonymous visitors can read, what a non-admin can do, and how revisions behave.
 * Supabase-specific pieces (roles, auth.uid()) are stubbed; the storage migration is not run here.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(__dirname, "../supabase/migrations/20261014000001_schema.sql"),
  "utf8",
);

const ADMIN = "11111111-1111-1111-1111-111111111111";
const STRANGER = "22222222-2222-2222-2222-222222222222";

let db: PGlite;

async function as(role: "anon" | "authenticated" | "postgres", uid: string | null = null) {
  await db.exec("reset role");
  await db.query("select set_config('test.uid', $1, false)", [uid ?? ""]);
  if (role !== "postgres") await db.exec(`set role ${role}`);
}

async function rows<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  return (await db.query<T>(sql, params)).rows;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    -- Mimic Supabase's default grants so RLS (not missing privileges) is what gets tested.
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on sequences to anon, authenticated;
  `);
  await db.exec(migration);
  await db.exec(migration); // must be safe to re-run
  await db.query("insert into auth.users(id) values ($1), ($2)", [ADMIN, STRANGER]);
  await db.query("insert into public.admin_users(user_id) values ($1)", [ADMIN]);
});

const offer = (extra: Record<string, unknown> = {}) => ({
  offer_id: "OFF-TEST00000001",
  name: "Fictional test offer",
  category: "Products",
  deleted: false,
  fictional: false,
  lifecycle: "available",
  approval_status: "draft",
  source_version: "internal-only",
  ...extra,
});

describe("administrator write functions", () => {
  it("rejects anonymous callers and signed-in non-admins", async () => {
    await as("anon");
    await expect(db.query("select public.admin_save_offer($1::jsonb)", [JSON.stringify(offer())])).rejects.toThrow(
      /permission denied/i,
    );
    await as("authenticated", STRANGER);
    await expect(db.query("select public.admin_save_offer($1::jsonb)", [JSON.stringify(offer())])).rejects.toThrow(
      /Administrator access is required/,
    );
  });

  it("creates revision 1, then 2, and keeps every revision", async () => {
    await as("authenticated", ADMIN);
    const first = await rows<{ p: { revision: number; offer_id: string } }>(
      "select public.admin_save_offer($1::jsonb, null, 'save') as p",
      [JSON.stringify(offer())],
    );
    expect(first[0].p.revision).toBe(1);
    const second = await rows<{ p: { revision: number; name: string } }>(
      "select public.admin_save_offer($1::jsonb, 1, 'edit') as p",
      [JSON.stringify(offer({ name: "Renamed" }))],
    );
    expect(second[0].p.revision).toBe(2);
    expect(second[0].p.name).toBe("Renamed");
    const versions = await rows<{ revision: number; action: string }>(
      "select revision, action from public.offer_versions order by revision",
    );
    expect(versions).toEqual([
      { revision: 1, action: "save" },
      { revision: 2, action: "edit" },
    ]);
  });

  it("rejects stale revisions and duplicate IDs (case-insensitive)", async () => {
    await as("authenticated", ADMIN);
    await expect(
      db.query("select public.admin_save_offer($1::jsonb, 1, 'edit')", [JSON.stringify(offer())]),
    ).rejects.toThrow(/changed in another session/);
    await expect(
      db.query("select public.admin_save_offer($1::jsonb, null)", [
        JSON.stringify(offer({ offer_id: "off-test00000001" })),
      ]),
    ).rejects.toThrow(/already exists/);
  });

  it("blocks direct writes to base tables, even for the administrator", async () => {
    await as("authenticated", ADMIN);
    await expect(db.query("delete from public.offer_versions")).resolves.toMatchObject({ affectedRows: 0 });
    await expect(db.query("update public.offers set revision = 99")).resolves.toMatchObject({ affectedRows: 0 });
    await expect(
      db.query("insert into public.offers(offer_id, revision, payload) values ('X-1', 1, '{}')"),
    ).rejects.toThrow(/row-level security/i);
  });
});

describe("what visitors can read", () => {
  it("anonymous users cannot read any base table", async () => {
    await as("anon");
    for (const table of ["offers", "offer_versions", "gto_templates", "official_terms_snapshots", "admin_users", "operation_items"]) {
      await expect(db.query(`select * from public.${table}`), table).rejects.toThrow(/permission denied/i);
    }
  });

  it("a signed-in non-admin sees nothing in base tables (row-level security)", async () => {
    await as("authenticated", STRANGER);
    expect(await rows("select * from public.offers")).toHaveLength(0);
    expect(await rows("select * from public.offer_versions")).toHaveLength(0);
    expect(await rows("select * from public.admin_users")).toHaveLength(0);
  });

  it("public_offers hides deleted and fictional records and internal columns", async () => {
    await as("authenticated", ADMIN);
    await db.query("select public.admin_save_offer($1::jsonb)", [JSON.stringify(offer({ offer_id: "OFF-DELETED0001", deleted: true }))]);
    await db.query("select public.admin_save_offer($1::jsonb)", [JSON.stringify(offer({ offer_id: "OFF-FICTIONAL01", fictional: true }))]);
    await as("anon");
    const visible = await rows<Record<string, unknown>>("select * from public.public_offers");
    expect(visible.map((r) => r.offer_id)).toEqual(["OFF-TEST00000001"]);
    const columns = Object.keys(visible[0]);
    for (const hidden of ["payload", "approval_status", "source_version", "review_due", "deleted", "fictional"]) {
      expect(columns).not.toContain(hidden);
    }
    expect(columns).toContain("name");
  });

  it("public_templates hides soft-deleted templates", async () => {
    await as("authenticated", ADMIN);
    const base = { title: "T", category: "Wallet", path: "Wallet / T", source: "x.docx", start: 3, blocks: [], paragraphs: [] };
    await db.query("select public.admin_save_template($1::jsonb)", [JSON.stringify({ ...base, template_id: "TPL-A" })]);
    await db.query("select public.admin_save_template($1::jsonb)", [JSON.stringify({ ...base, template_id: "TPL-B" })]);
    await db.query("select public.admin_save_template($1::jsonb, 1, 'delete')", [
      JSON.stringify({ ...base, template_id: "TPL-B", deleted: true }),
    ]);
    await as("anon");
    expect((await rows("select template_id from public.public_templates")).map((r) => (r as { template_id: string }).template_id)).toEqual(["TPL-A"]);
    await as("authenticated", ADMIN);
    expect(await rows("select revision from public.gto_template_history where template_id = 'TPL-B' order by revision")).toHaveLength(2);
  });

  it("public_official_terms serves only the latest snapshot", async () => {
    await as("authenticated", ADMIN);
    const a = await rows<{ r: number }>("select public.admin_add_terms_snapshot('<p>One</p>', 'https://example.test') as r");
    const same = await rows<{ r: number }>("select public.admin_add_terms_snapshot('<p>One</p>', 'https://example.test') as r");
    const b = await rows<{ r: number }>("select public.admin_add_terms_snapshot('<p>Two</p>', 'https://example.test') as r");
    expect([a[0].r, same[0].r, b[0].r]).toEqual([1, 1, 2]);
    await expect(db.query("select public.admin_add_terms_snapshot('   ', 'x')")).rejects.toThrow(/empty/);
    await as("anon");
    const latest = await rows<{ revision: number; html: string }>("select revision, html from public.public_official_terms");
    expect(latest).toEqual([{ revision: 2, html: "<p>Two</p>" }]);
  });

  it("only the administrator can delete a general-terms snapshot", async () => {
    await as("authenticated", STRANGER);
    expect(await db.query("delete from public.official_terms_snapshots where revision = 2")).toMatchObject({ affectedRows: 0 });
    await as("authenticated", ADMIN);
    expect(await db.query("delete from public.official_terms_snapshots where revision = 2")).toMatchObject({ affectedRows: 1 });
    await as("anon");
    expect((await rows<{ revision: number }>("select revision from public.public_official_terms"))[0].revision).toBe(1);
  });
});
