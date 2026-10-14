"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session";
import { usingFixtures } from "@/lib/supabase/env";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (usingFixtures()) redirect("/admin");

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const client = await createSessionClient();
  if (!client) return { error: "The database is not connected yet. See web/README.md." };

  const { error } = await client.auth.signInWithPassword({ email, password });
  // One message for every failure, so the form never reveals whether an email exists.
  if (error) return { error: "Incorrect email or password." };

  const { data: allowed } = await client.rpc("is_admin");
  if (allowed !== true) {
    await client.auth.signOut();
    return { error: "This account does not have administrator access." };
  }
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  const client = await createSessionClient();
  await client?.auth.signOut();
  redirect("/admin/login");
}
