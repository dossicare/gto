/**
 * Offer rules ported from knowledge/offers.py: cleaning, optional-entry defaults, validation and
 * lexical search. Pure functions only; persistence lives in the repositories.
 */
import { isIsoDate, isNA, safeHttpUrl, todayCairo, words } from "./text";
import {
  OFFER_BOOL_FIELDS,
  OFFER_TEXT_FIELDS,
  type OfferRecord,
  type OfferTextField,
  type PublicOffer,
} from "./types";

export const APPROVALS = ["draft", "approved", "rejected"] as const;
export const LIFECYCLES = ["available", "suspended", "archived"] as const;

/** Fields that read "N/A" when the person leaves them blank (everyday entry is intentionally optional). */
export const OPTIONAL_ENTRY_FIELDS: OfferTextField[] = [
  "name", "category", "description", "benefits", "eligibility", "terms", "tc_url",
  "restrictions", "exclusions", "calculation_rules", "original_source", "notes", "keywords",
  "wallet_activation_date", "wallet_activation_details", "schedule_details", "notice_period",
  "launch_date",
];

export function newOfferId(): string {
  return "OFF-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
}

export function blankOffer(): OfferRecord {
  const record = {} as OfferRecord;
  for (const key of OFFER_TEXT_FIELDS) record[key] = "";
  for (const key of OFFER_BOOL_FIELDS) record[key] = false;
  record.approval_status = "draft";
  record.lifecycle = "available";
  record.attachment_ids = [];
  return record;
}

/** Trims text, rejects non-text values, and fills every known field (unknown keys are dropped). */
export function cleanOffer(input: Record<string, unknown>): OfferRecord {
  const r = blankOffer();
  for (const key of OFFER_TEXT_FIELDS) {
    const value = input[key] ?? r[key];
    if (typeof value !== "string") throw new Error(`${key} must be text`);
    r[key] = value.trim();
  }
  for (const key of OFFER_BOOL_FIELDS) {
    const value = input[key] ?? false;
    if (value !== true && value !== false && value !== 0 && value !== 1) {
      throw new Error(`${key} must be true or false`);
    }
    r[key] = Boolean(value);
  }
  const ids = input.attachment_ids ?? [];
  if (!Array.isArray(ids) || ids.some((i) => !Number.isInteger(i))) {
    throw new Error("Invalid attachment selection");
  }
  r.attachment_ids = [...new Set(ids as number[])];
  // Keep server-owned bookkeeping if it was supplied.
  if (typeof input.revision === "number") r.revision = input.revision;
  if (typeof input.updated_at === "string") r.updated_at = input.updated_at;
  return r;
}

/** Everyday entry: blanks become "N/A" and every save is a draft (no approval workflow here). */
export function optionalEntry(input: Record<string, unknown>): OfferRecord {
  const r = cleanOffer(input);
  for (const key of OPTIONAL_ENTRY_FIELDS) r[key] = r[key] || "N/A";
  r.approval_status = "draft";
  return r;
}

export function validateOffer(r: OfferRecord, today: string = todayCairo()): OfferRecord {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{2,63}$/.test(r.offer_id)) {
    throw new Error("Offer ID must contain 3-64 letters, numbers, dots, dashes or underscores");
  }
  for (const key of ["name", "category", "description"] as const) {
    if (!r[key]) throw new Error(`${key} is required`);
  }
  if (!(APPROVALS as readonly string[]).includes(r.approval_status) ||
      !(LIFECYCLES as readonly string[]).includes(r.lifecycle)) {
    throw new Error("Invalid approval status or lifecycle");
  }
  for (const key of OFFER_TEXT_FIELDS) {
    if (r[key].length > (key === "terms" ? 500_000 : 50_000)) throw new Error(`${key} is too long`);
  }
  if (r.name.length > 300) throw new Error("Offer name is too long");
  if (!isNA(r.tc_url) && !safeHttpUrl(r.tc_url)) {
    throw new Error("Official T&C URL must be a complete http or https URL");
  }
  if (!isNA(r.original_source) && !safeHttpUrl(r.original_source) &&
      !/^(document:|sample:)/.test(r.original_source)) {
    throw new Error("Original source must be a URL or document: reference");
  }
  for (const key of ["activation_date", "expiry_date", "last_verified_date", "review_due", "wallet_activation_date"] as const) {
    const value = r[key];
    if (value && !(key === "wallet_activation_date" && value === "N/A")) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${key} must use YYYY-MM-DD`);
      if (!isIsoDate(value)) throw new Error(`${key} is not a valid calendar date`);
    }
  }
  if (r.no_expiry && r.expiry_date) {
    throw new Error("Choose an expiry date or explicitly confirmed no expiry, not both");
  }
  if (r.activation_date && r.expiry_date && r.expiry_date < r.activation_date) {
    throw new Error("Expiry date cannot precede activation date");
  }
  if (r.last_verified_date && r.last_verified_date > today) {
    throw new Error("Last verified date cannot be in the future");
  }
  if (r.review_due && r.last_verified_date && r.review_due < r.last_verified_date) {
    throw new Error("Review due date cannot precede verification");
  }
  return r;
}

// --- Search ------------------------------------------------------------------------------------

const STOP = new Set([
  "a", "an", "and", "the", "is", "are", "was", "were", "i", "we", "you", "my", "me", "it",
  "what", "which", "how", "can", "do", "does", "to", "for", "of", "in", "on", "about",
  "please", "tell", "explain", "currently", "current", "available", "offer", "offers",
]);

export const SEARCH_FIELDS = [
  "offer_id", "name", "category", "description", "benefits", "eligibility", "terms",
  "restrictions", "exclusions", "calculation_rules", "keywords", "wallet_activation_date",
  "wallet_activation_details", "notice_period",
] as const;

export function searchTokens(text: string): string[] {
  return words(text).filter((t) => !STOP.has(t));
}

/** Exact-word relevance: name/ID hits weigh 5, other fields 1; an exact ID is 1000. */
export function relevance(offer: PublicOffer, query: string): number {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return 1;
  if (query.trim().toLowerCase() === offer.offer_id.toLowerCase()) return 1000;
  let score = 0;
  for (const token of tokens) {
    for (const field of SEARCH_FIELDS) {
      const haystack = new Set(words(offer[field] ?? ""));
      if (haystack.has(token)) score += field === "name" || field === "offer_id" ? 5 : 1;
    }
  }
  return score;
}

export function searchOffers(
  offers: PublicOffer[],
  { query = "", category = "" }: { query?: string; category?: string } = {},
): (PublicOffer & { score: number })[] {
  return offers
    .filter((o) => !category || o.category === category)
    .map((o) => ({ ...o, score: relevance(o, query) }))
    .filter((o) => o.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
