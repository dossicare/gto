"use server";

import { OFFER_FORM_FIELDS, offerFormSchema } from "@/lib/admin-schemas";
import { requireAdmin } from "@/lib/auth";
import { lookupLaunchDate } from "@/lib/launch-dates";
import { blankOffer, newOfferId, optionalEntry, validateOffer } from "@/lib/offers";
import { isNA } from "@/lib/text";
import type { OfferRecord } from "@/lib/types";
import { done, failed, messageOf, type ActionResult } from "../state";

interface Saved {
  id: string;
  revision: number;
  /** Set when the launch date was read from the official T&C page title. */
  note?: string;
}

/** Create or update an offer. Hidden metadata on an existing record is always preserved. */
export async function saveOfferAction(input: unknown): Promise<ActionResult<Saved>> {
  const { repo } = await requireAdmin();
  const parsed = offerFormSchema.safeParse(input);
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  const form = parsed.data;

  try {
    const isNew = form.offer_id === "";
    const current = isNew ? null : await repo.getOffer(form.offer_id);
    if (!isNew && !current) return failed("This offer no longer exists.");
    if (!isNew && form.expected_revision === null) return failed("Reload the page and try again.");

    const base: OfferRecord = current ?? { ...blankOffer(), offer_id: newOfferId() };
    const next: OfferRecord = { ...base };
    for (const field of OFFER_FORM_FIELDS) {
      // `lifecycle` is the only non-free-text field; everything else is stored as typed.
      (next as Record<string, unknown>)[field] = form[field];
    }

    // A blank launch date with a T&C link triggers a bounded lookup of the official page title.
    // A failed lookup never blocks saving, and a typed date is never overwritten.
    let note: string | undefined;
    const launch = next.launch_date.trim();
    const link = next.tc_url.trim();
    if (isNA(launch) && !isNA(link)) {
      const [value, evidence] = await lookupLaunchDate(link);
      next.launch_date = value;
      next.launch_date_evidence = evidence;
      note = `Launch date: ${value}`;
    } else if (next.launch_date !== base.launch_date || next.tc_url !== base.tc_url) {
      next.launch_date_evidence = "Manually entered date; not verified against the current T&C link.";
    }

    const record = validateOffer(optionalEntry(next as unknown as Record<string, unknown>));
    const saved = await repo.saveOffer(record, isNew ? null : form.expected_revision, "save");
    return done({ id: saved.offer_id, revision: saved.revision ?? 1, note });
  } catch (error) {
    return failed(messageOf(error));
  }
}

/** Soft delete: the offer leaves the public site, its history stays, and it can be restored. */
export async function deleteOfferAction(id: string, expectedRevision: number): Promise<ActionResult> {
  const { repo } = await requireAdmin();
  try {
    const current = await repo.getOffer(id);
    if (!current) return failed("Offer not found.");
    await repo.saveOffer({ ...current, deleted: true, approval_status: "draft" }, expectedRevision, "delete (history retained)");
    return done();
  } catch (error) {
    return failed(messageOf(error));
  }
}

/** Bring a soft-deleted offer back exactly as it was when it was deleted. */
export async function undeleteOfferAction(id: string, expectedRevision: number): Promise<ActionResult> {
  const { repo } = await requireAdmin();
  try {
    const current = await repo.getOffer(id);
    if (!current) return failed("Offer not found.");
    await repo.saveOffer({ ...current, deleted: false }, expectedRevision, "restore (undelete)");
    return done();
  } catch (error) {
    return failed(messageOf(error));
  }
}

/** Save an earlier revision as a NEW revision (history is never rewritten). */
export async function restoreOfferRevisionAction(id: string, revision: number, expectedRevision: number): Promise<ActionResult> {
  const { repo } = await requireAdmin();
  try {
    const history = await repo.offerHistory(id);
    const source = history.find((h) => h.revision === revision)?.payload;
    if (!source) return failed("That revision was not found.");
    await repo.saveOffer(
      { ...source, approval_status: "draft", last_verified_date: "", review_due: "", deleted: false },
      expectedRevision,
      `restore revision ${revision}`,
    );
    return done();
  } catch (error) {
    return failed(messageOf(error));
  }
}
