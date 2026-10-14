import type { SupabaseClient } from "@supabase/supabase-js";
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
import { RepoError, type AdminRepo, type PublicRepo } from "./types";

type Row = Record<string, unknown>;

function fail(context: string, error: { message: string } | null): never {
  // Messages raised by the database functions (revision conflicts, missing rights) are meant to be
  // shown to the administrator; anything else is kept generic.
  const known = /changed in another session|already exists|Administrator access is required|is empty/.test(
    error?.message ?? "",
  );
  throw new RepoError(known ? error!.message : `${context} failed. Please try again.`);
}

const text = (v: unknown): string => (typeof v === "string" ? v : "");

function toPublicOffer(row: Row): PublicOffer {
  const field = (k: string) => text(row[k]);
  return {
    offer_id: field("offer_id"),
    revision: Number(row.revision ?? 1),
    updated_at: field("updated_at"),
    name: field("name"),
    category: field("category"),
    description: field("description"),
    benefits: field("benefits"),
    eligibility: field("eligibility"),
    restrictions: field("restrictions"),
    exclusions: field("exclusions"),
    terms: field("terms"),
    tc_url: field("tc_url"),
    original_source: field("original_source"),
    keywords: field("keywords"),
    calculation_rules: field("calculation_rules"),
    notes: field("notes"),
    notice_period: field("notice_period"),
    schedule_details: field("schedule_details"),
    launch_date: field("launch_date"),
    launch_date_evidence: field("launch_date_evidence"),
    wallet_activation_date: field("wallet_activation_date"),
    wallet_activation_details: field("wallet_activation_details"),
    lifecycle: field("lifecycle") || "available",
  };
}

function toTemplate(row: Row): PublicTemplate {
  return {
    template_id: text(row.template_id),
    revision: Number(row.revision ?? 1),
    title: text(row.title),
    category: text(row.category),
    path: text(row.path),
    source: text(row.source),
    start: Number(row.start ?? 0),
    blocks: Array.isArray(row.blocks) ? (row.blocks as PublicTemplate["blocks"]) : [],
    paragraphs: Array.isArray(row.paragraphs) ? (row.paragraphs as PublicTemplate["paragraphs"]) : [],
  };
}

export function publicRepo(db: SupabaseClient): PublicRepo {
  return {
    async offers() {
      const { data, error } = await db.from("public_offers").select("*").order("name");
      if (error) fail("Loading offers", error);
      return (data ?? []).map(toPublicOffer);
    },
    async offer(id) {
      const { data, error } = await db.from("public_offers").select("*").eq("offer_id", id).maybeSingle();
      if (error) fail("Loading the offer", error);
      return data ? toPublicOffer(data) : null;
    },
    async templates() {
      const { data, error } = await db.from("public_templates").select("*").order("start");
      if (error) fail("Loading templates", error);
      return (data ?? []).map(toTemplate);
    },
    async template(id) {
      const { data, error } = await db.from("public_templates").select("*").eq("template_id", id).maybeSingle();
      if (error) fail("Loading the template", error);
      return data ? toTemplate(data) : null;
    },
    async terms() {
      const { data, error } = await db.from("public_official_terms").select("*").maybeSingle();
      if (error) fail("Loading the general terms", error);
      return data
        ? {
            revision: Number(data.revision),
            source_url: text(data.source_url),
            fetched_at: text(data.fetched_at),
            html: text(data.html),
          }
        : null;
    },
  };
}

async function total(query: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
  const { count, error } = await query;
  if (error) fail("Counting records", error);
  return count ?? 0;
}

const head = { count: "exact", head: true } as const;

export function adminRepo(db: SupabaseClient): AdminRepo {
  return {
    async counts(): Promise<AdminCounts> {
      const [all, deleted, templates, snapshots, documents] = await Promise.all([
        total(db.from("offers").select("*", head)),
        total(db.from("offers").select("*", head).eq("payload->>deleted", "true")),
        total(db.from("gto_templates").select("*", head).eq("deleted", false)),
        total(db.from("official_terms_snapshots").select("*", head)),
        total(db.from("source_documents").select("*", head)),
      ]);
      return { offers: all - deleted, offersDeleted: deleted, templates, snapshots, documents };
    },

    async listOffers(includeDeleted) {
      const { data, error } = await db.from("offers").select("payload").order("offer_id");
      if (error) fail("Loading offers", error);
      const all = (data ?? []).map((r) => r.payload as OfferRecord);
      return all
        .filter((o) => includeDeleted || !o.deleted)
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    },
    async getOffer(id) {
      const { data, error } = await db.from("offers").select("payload").eq("offer_id", id).maybeSingle();
      if (error) fail("Loading the offer", error);
      return (data?.payload as OfferRecord) ?? null;
    },
    async offerHistory(id) {
      const { data, error } = await db
        .from("offer_versions")
        .select("revision, saved_at, action, payload")
        .eq("offer_id", id)
        .order("revision", { ascending: false });
      if (error) fail("Loading history", error);
      return (data ?? []) as VersionEntry<OfferRecord>[];
    },
    async saveOffer(record, expectedRevision, action) {
      const { data, error } = await db.rpc("admin_save_offer", {
        p_payload: record,
        p_expected: expectedRevision,
        p_action: action,
      });
      if (error) fail("Saving the offer", error);
      return data as OfferRecord;
    },

    async listTemplates(includeDeleted) {
      const { data, error } = await db.from("gto_templates").select("payload, deleted").order("template_id");
      if (error) fail("Loading templates", error);
      return (data ?? [])
        .filter((r) => includeDeleted || !r.deleted)
        .map((r) => ({ ...(r.payload as TemplateRecord), deleted: Boolean(r.deleted) }))
        .sort((a, b) => a.start - b.start);
    },
    async getTemplate(id) {
      const { data, error } = await db.from("gto_templates").select("payload, deleted").eq("template_id", id).maybeSingle();
      if (error) fail("Loading the template", error);
      return data ? { ...(data.payload as TemplateRecord), deleted: Boolean(data.deleted) } : null;
    },
    async templateHistory(id) {
      const { data, error } = await db
        .from("gto_template_history")
        .select("revision, saved_at, action, payload")
        .eq("template_id", id)
        .order("revision", { ascending: false });
      if (error) fail("Loading history", error);
      return (data ?? []) as VersionEntry<TemplateRecord>[];
    },
    async saveTemplate(record, expectedRevision, action) {
      const { data, error } = await db.rpc("admin_save_template", {
        p_payload: record,
        p_expected: expectedRevision,
        p_action: action,
      });
      if (error) fail("Saving the template", error);
      return data as TemplateRecord;
    },

    async snapshots() {
      const { data, error } = await db
        .from("official_terms_snapshots")
        .select("revision, source_url, fetched_at, sha256, html")
        .order("revision", { ascending: false });
      if (error) fail("Loading snapshots", error);
      return (data ?? []) as TermsSnapshot[];
    },
    async addSnapshot(html, sourceUrl) {
      const { data, error } = await db.rpc("admin_add_terms_snapshot", { p_html: html, p_source_url: sourceUrl });
      if (error) fail("Saving the general terms", error);
      return Number(data);
    },
    async deleteSnapshot(revision) {
      const { data, error } = await db.from("official_terms_snapshots").delete().eq("revision", revision).select("revision");
      if (error) fail("Deleting the snapshot", error);
      if (!data?.length) throw new RepoError("Snapshot not found.");
    },

    async documents() {
      const { data, error } = await db
        .from("source_documents")
        .select("id, origin, filename, version, media_type, sha256, size, storage_path")
        .order("id");
      if (error) fail("Loading documents", error);
      const docs = (data ?? []) as SourceDocument[];
      const paths = docs.map((d) => d.storage_path).filter((p): p is string => Boolean(p));
      const signed = new Map<string, string>();
      if (paths.length) {
        const { data: urls } = await db.storage.from("source-documents").createSignedUrls(paths, 300);
        for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
      }
      return docs.map((d) => ({ ...d, url: d.storage_path ? (signed.get(d.storage_path) ?? null) : null }));
    },
  };
}
