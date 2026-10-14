import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/** Cookieless client for visitors: no session, so it can only reach the public_* views. */
export function createPublicClient(): SupabaseClient | null {
  const env = supabaseEnv();
  if (!env) return null;
  return createClient(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
