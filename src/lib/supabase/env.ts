/**
 * Supabase connection settings, read on the SERVER only (no browser code imports this file).
 *
 * Use SUPABASE_URL and SUPABASE_ANON_KEY: without the NEXT_PUBLIC_ prefix, Next.js never copies the
 * values into code sent to visitors. The older NEXT_PUBLIC_ names still work as a fallback.
 *
 * The key is the publishable (anon) key: it only unlocks what the database's row-level security and
 * the public_* views allow. The service-role key is never used by this app (only by the one-off
 * import script, run locally).
 */
export function supabaseEnv(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  const key = (process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  return url && key ? { url, key } : null;
}

/** Development-only sample data (fictional), so the screens can be tried without a database. */
export function usingFixtures(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.SK_FIXTURES === "1";
}
