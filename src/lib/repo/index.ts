import { createPublicClient } from "../supabase/public";
import { usingFixtures } from "../supabase/env";
import { fixturePublicRepo } from "./fixtures";
import { publicRepo as supabasePublicRepo } from "./supabase";
import type { PublicRepo } from "./types";

export { RepoError } from "./types";
export type { AdminRepo, PublicRepo } from "./types";

/** The repository for visitors, or null when no database has been configured yet. */
export function getPublicRepo(): PublicRepo | null {
  if (usingFixtures()) return fixturePublicRepo;
  const client = createPublicClient();
  return client ? supabasePublicRepo(client) : null;
}
