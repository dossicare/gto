import { cache } from "react";
import { redirect } from "next/navigation";
import { createSessionClient } from "./supabase/session";
import { usingFixtures } from "./supabase/env";
import { adminRepo } from "./repo/supabase";
import { fixtureAdminRepo } from "./repo/fixtures";
import type { AdminRepo } from "./repo/types";

export interface AdminSession {
  email: string;
  repo: AdminRepo;
}

/**
 * The signed-in administrator, or null. Checked against the Supabase Auth server (not just the
 * cookie) AND the admin_users allow-list, on every request. Any signed-in account that is not on
 * the allow-list is treated as signed out.
 */
export const getAdmin = cache(async (): Promise<AdminSession | null> => {
  if (usingFixtures()) return { email: "sample-admin@example.test", repo: fixtureAdminRepo };
  const client = await createSessionClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  if (!data.user) return null;
  const { data: allowed } = await client.rpc("is_admin");
  if (allowed !== true) return null;
  return { email: data.user.email ?? "", repo: adminRepo(client) };
});

/** Use at the top of every admin page and action. */
export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
