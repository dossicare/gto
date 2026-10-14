"use server";

import { termsHtmlSchema } from "@/lib/admin-schemas";
import { requireAdmin } from "@/lib/auth";
import { fetchOfficialTerms, OFFICIAL_TERMS_URL } from "@/lib/official-terms";
import { done, failed, messageOf, type ActionResult } from "../state";

/** Pull the current published terms from the official site and save them as a new snapshot. */
export async function fetchOfficialTermsAction(): Promise<ActionResult<{ revision: number }>> {
  const { repo } = await requireAdmin();
  try {
    const html = await fetchOfficialTerms();
    return done({ revision: await repo.addSnapshot(html, OFFICIAL_TERMS_URL) });
  } catch (error) {
    return failed(messageOf(error));
  }
}

/** Save pasted HTML as a new snapshot (shown to visitors after sanitising). */
export async function addTermsSnapshotAction(html: string): Promise<ActionResult<{ revision: number }>> {
  const { repo } = await requireAdmin();
  const parsed = termsHtmlSchema.safeParse(html);
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Check the text and try again.");
  try {
    return done({ revision: await repo.addSnapshot(parsed.data, OFFICIAL_TERMS_URL) });
  } catch (error) {
    return failed(messageOf(error));
  }
}

/** Permanent. Visitors then see the next most recent snapshot. */
export async function deleteSnapshotAction(revision: number): Promise<ActionResult> {
  const { repo } = await requireAdmin();
  if (!Number.isInteger(revision) || revision < 1) return failed("Invalid snapshot.");
  try {
    await repo.deleteSnapshot(revision);
    return done();
  } catch (error) {
    return failed(messageOf(error));
  }
}
