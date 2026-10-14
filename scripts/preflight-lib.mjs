// Loads an export into an IN-MEMORY Postgres (PGlite) using the real migration, to prove the data fits
// the schema before anything is sent to Supabase. No network, nothing is written to disk.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const migrationFile = path.resolve(fileURLToPath(new URL("../supabase/migrations/20261014000001_schema.sql", import.meta.url)));

/** A fresh in-memory database with Supabase's roles and auth.uid() stubbed, and the migration applied. */
export async function freshDatabase() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
  `);
  await db.exec(readFileSync(migrationFile, "utf8"));
  return db;
}

const firstLine = (error) => String(error?.message ?? error).split("\n")[0].slice(0, 240);

/**
 * Inserts every row the way the importer does: only missing rows, never overwriting. Columns are named
 * explicitly so anything the export omits (timestamps, actions...) takes the column's default.
 * Returns { table: rowsInserted } and, for a table that failed, { table: "error: <short message>" }.
 */
export async function loadPlan(db, plan) {
  const result = {};
  for (const { table, rows } of plan.steps) {
    if (rows.length === 0) {
      result[table] = 0;
      continue;
    }
    const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const list = columns.map((c) => `"${c}"`).join(", ");
    try {
      const r = await db.query(
        `insert into public.${table} (${list}) select ${list} from jsonb_populate_recordset(null::public.${table}, $1::jsonb) on conflict do nothing`,
        [JSON.stringify(rows)],
      );
      result[table] = r.affectedRows ?? 0;
    } catch (error) {
      result[table] = "error: " + firstLine(error);
    }
  }
  return result;
}
