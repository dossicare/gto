/** Data shapes shared by the repositories, pages and forms. */

export const OFFER_TEXT_FIELDS = [
  "offer_id", "name", "category", "description", "benefits", "eligibility",
  "terms", "tc_url", "restrictions", "exclusions", "activation_date",
  "expiry_date", "calculation_rules", "original_source", "source_version",
  "last_verified_date", "approval_status", "notes", "keywords", "review_due",
  "lifecycle", "legacy_reference", "wallet_activation_date",
  "wallet_activation_details", "schedule_details", "notice_period",
  "launch_date", "launch_date_evidence",
] as const;

export const OFFER_BOOL_FIELDS = ["no_expiry", "terms_complete", "fictional", "deleted"] as const;

export type OfferTextField = (typeof OFFER_TEXT_FIELDS)[number];
export type OfferBoolField = (typeof OFFER_BOOL_FIELDS)[number];

/** A complete offer as stored (administrators only). Hidden metadata is preserved on every edit. */
export type OfferRecord = Record<OfferTextField, string> &
  Record<OfferBoolField, boolean> & {
    attachment_ids: number[];
    revision?: number;
    updated_at?: string;
  };

/** The subset of an offer that visitors may see (the `public_offers` view). */
export type PublicOffer = Pick<
  OfferRecord,
  | "offer_id" | "name" | "category" | "description" | "benefits" | "eligibility"
  | "restrictions" | "exclusions" | "terms" | "tc_url" | "original_source" | "keywords"
  | "calculation_rules" | "notes" | "notice_period" | "schedule_details" | "launch_date"
  | "launch_date_evidence" | "wallet_activation_date" | "wallet_activation_details" | "lifecycle"
> & { revision: number; updated_at: string };

export type TemplateKind = "English" | "Arabic" | "Notes";

export interface TemplateParagraph {
  number: number;
  text: string;
}

export interface TemplateBlock {
  kind: TemplateKind;
  paragraphs: TemplateParagraph[];
}

/** The visitor-facing template (the `public_templates` view). */
export interface PublicTemplate {
  template_id: string;
  revision: number;
  title: string;
  category: string;
  path: string;
  source: string;
  start: number;
  blocks: TemplateBlock[];
  paragraphs: TemplateParagraph[];
}

/** A template as stored (administrators only). */
export interface TemplateRecord extends PublicTemplate {
  sha256?: string;
  deleted?: boolean;
}

export interface TermsSnapshot {
  revision: number;
  source_url: string;
  fetched_at: string;
  html: string;
  sha256?: string;
}

export interface VersionEntry<T> {
  revision: number;
  saved_at: string;
  action: string;
  payload: T;
}

export interface SourceDocument {
  id: number;
  origin: string;
  filename: string;
  version: string;
  media_type: string;
  sha256: string;
  size: number;
  storage_path: string | null;
}

export interface AdminCounts {
  offers: number;
  offersDeleted: number;
  templates: number;
  snapshots: number;
  documents: number;
}
