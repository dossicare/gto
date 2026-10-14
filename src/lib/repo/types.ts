import type {
  AdminCounts,
  OfferRecord,
  PublicOffer,
  PublicTemplate,
  SourceDocument,
  TemplateRecord,
  TermsSnapshot,
  VersionEntry,
} from "../types";

/** What visitors can read. */
export interface PublicRepo {
  offers(): Promise<PublicOffer[]>;
  offer(id: string): Promise<PublicOffer | null>;
  templates(): Promise<PublicTemplate[]>;
  template(id: string): Promise<PublicTemplate | null>;
  terms(): Promise<TermsSnapshot | null>;
}

/** What the signed-in administrator can read and change. */
export interface AdminRepo {
  counts(): Promise<AdminCounts>;

  listOffers(includeDeleted: boolean): Promise<OfferRecord[]>;
  getOffer(id: string): Promise<OfferRecord | null>;
  offerHistory(id: string): Promise<VersionEntry<OfferRecord>[]>;
  /** `expectedRevision` is null for a new offer; a stale value is rejected. */
  saveOffer(record: OfferRecord, expectedRevision: number | null, action: string): Promise<OfferRecord>;

  listTemplates(includeDeleted: boolean): Promise<TemplateRecord[]>;
  getTemplate(id: string): Promise<TemplateRecord | null>;
  templateHistory(id: string): Promise<VersionEntry<TemplateRecord>[]>;
  saveTemplate(record: TemplateRecord, expectedRevision: number | null, action: string): Promise<TemplateRecord>;

  snapshots(): Promise<TermsSnapshot[]>;
  addSnapshot(html: string, sourceUrl: string): Promise<number>;
  deleteSnapshot(revision: number): Promise<void>;

  documents(): Promise<(SourceDocument & { url: string | null })[]>;
}

export class RepoError extends Error {}
