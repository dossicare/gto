/**
 * Supabase connection settings. Both values are safe to expose: the anon key only unlocks what the
 * database's row-level security and the public_* views allow. The service-role key is never used
 * by this app (only by the one-off import script, run locally).
 */
export function supabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return url && key ? { url, key } : null;
}

/** Development-only sample data (fictional), so the screens can be tried without a database. */
export function usingFixtures(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.SK_FIXTURES === "1";
}
