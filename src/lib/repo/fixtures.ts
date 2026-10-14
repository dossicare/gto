/**
 * Development-only, in-memory stand-in for Supabase (enabled with SK_FIXTURES=1 outside production).
 * All content is FICTIONAL. It mirrors the database functions' rules (revision checks, immutable
 * history, soft delete) so the screens can be exercised without a database.
 */
import { blankOffer } from "../offers";
import type {
  OfferRecord,
  PublicOffer,
  PublicTemplate,
  SourceDocument,
  TemplateRecord,
  TermsSnapshot,
  VersionEntry,
} from "../types";
import { RepoError, type AdminRepo, type PublicRepo } from "./types";

interface State {
  offers: Map<string, OfferRecord>;
  offerVersions: Map<string, VersionEntry<OfferRecord>[]>;
  templates: Map<string, TemplateRecord>;
  templateVersions: Map<string, VersionEntry<TemplateRecord>[]>;
  snapshots: TermsSnapshot[];
}

const STAMP = "2026-10-01T09:00:00.000000+00:00";

function offer(id: string, patch: Partial<OfferRecord>): OfferRecord {
  return {
    ...blankOffer(),
    offer_id: id,
    revision: 1,
    updated_at: STAMP,
    launch_date_evidence: "Sample record. Fictional training data.",
    ...patch,
  };
}

const OFFERS: OfferRecord[] = [
  offer("FIX-OFFER-0001", {
    name: "Fictional Example: Flight Club Card",
    category: "Products",
    description: "A fictional product used to try the screens. It describes no real offer.",
    benefits: "Fictional benefit one.\nFictional benefit two with a longer line that should wrap nicely on a narrow phone screen without causing sideways scrolling.",
    restrictions: "Booking Restrictions: fictional rule about refundable rooms only.",
    eligibility: "Fictional eligibility text.",
    terms: "FICTIONAL TERMS\n\n1. This text is invented for testing.\n2. <script>alert('not executed')</script> is shown as plain text.\n3. " + "A deliberately long sentence to test wrapping and scrolling behaviour. ".repeat(12),
    tc_url: "https://example.com/fictional-terms",
    original_source: "sample:training-only",
    keywords: "fictional flight club card sample",
    launch_date: "2026-02-10",
    launch_date_evidence: "Date beside the T&C title; launch date not separately confirmed. (sample)",
    schedule_details: "Booking period: 1 Jan 2026 to 31 Mar 2026 (sample, as supplied).",
    notice_period: "14 days",
    calculation_rules: "Fictional calculation text. No formula is implied.",
    notes: "Sample notes.",
  }),
  offer("FIX-OFFER-0002", {
    name: "Fictional Example: Wallet Boost Promotion",
    category: "Promotions",
    description: "Fictional promotion description.",
    benefits: "Fictional wallet credit.",
    terms: "Fictional terms only.",
    tc_url: "N/A",
    original_source: "N/A",
    keywords: "wallet boost promotion sample",
    launch_date: "2025-11",
    wallet_activation_date: "2026-03-01",
    wallet_activation_details: "Fictional wallet activation details (not offer availability).",
  }),
  offer("FIX-OFFER-0003", {
    name: "Fictional Example: Hotel Pass",
    category: "Products",
    description: "Another fictional product.",
    benefits: "N/A",
    terms: "N/A",
    keywords: "hotel pass sample",
    launch_date: "N/A",
  }),
  offer("FIX-OFFER-0004", {
    name: "Fictional Example: Archived Voucher",
    category: "Promotions",
    description: "An archived fictional entry (hidden from the overview, still searchable with a label).",
    lifecycle: "archived",
    keywords: "archived voucher sample",
  }),
  offer("FIX-OFFER-0005", {
    name: "Fictional Example: Removed Entry",
    category: "Products",
    description: "A soft-deleted fictional entry (admin only).",
    deleted: true,
  }),
];

const t = (n: number, text: string) => ({ number: n, text });

const TEMPLATES: TemplateRecord[] = [
  {
    template_id: "FIX-TPL-0001",
    revision: 1,
    title: "Missing wallet credit",
    category: "Wallet",
    path: "Wallet / Missing wallet credit",
    source: "Fictional sample document.docx",
    start: 10,
    paragraphs: [t(10, "Fictional source paragraph."), t(11, "Second fictional source paragraph.")],
    blocks: [
      { kind: "Notes", paragraphs: [t(10, "Internal guidance (fictional): check the booking reference before replying.")] },
      { kind: "English", paragraphs: [t(11, "Dear {{customer_name}},"), t(12, "Thank you for contacting us. Your wallet credit will arrive within 14 days."), t(13, "Kind regards,\n{{agent_name}}")] },
      { kind: "Arabic", paragraphs: [t(14, "عزيزي {{customer_name}}،"), t(15, "شكرًا لتواصلك معنا. سيصل رصيد المحفظة خلال ٣٠ يومًا."), t(16, "مع أطيب التحيات،\n{{agent_name}}")] },
    ],
  },
  {
    template_id: "FIX-TPL-0002",
    revision: 1,
    title: "Booking cancellation request",
    category: "Cancellation",
    path: "Cancellation / Booking cancellation request",
    source: "Fictional sample document.docx",
    start: 20,
    paragraphs: [t(20, "Fictional source paragraph.")],
    blocks: [
      { kind: "English", paragraphs: [t(21, "We have received your cancellation request and will confirm within 2 working days.")] },
      { kind: "Arabic", paragraphs: [t(22, "لقد استلمنا طلب الإلغاء وسنؤكد خلال ٢ أيام عمل.")] },
    ],
  },
  {
    template_id: "FIX-TPL-0003",
    revision: 1,
    title: "English-only closing message",
    category: "Closing",
    path: "Closing / English-only closing message",
    source: "Fictional sample document.docx",
    start: 30,
    paragraphs: [t(30, "Fictional source paragraph.")],
    blocks: [{ kind: "English", paragraphs: [t(31, "Thank you for choosing us. Have a wonderful trip!")] }],
  },
];

const TERMS_HTML =
  "<h2>Fictional General Terms</h2><p>This sample text is invented. See <a href=\"https://example.com/terms\">the example page</a>.</p>" +
  "<ol><li>First fictional clause.</li><li>Second fictional clause with <strong>bold</strong> text.</li></ol>" +
  "<table><thead><tr><th>Item</th><th>Fictional value</th></tr></thead><tbody><tr><td>Notice</td><td>14 days</td></tr></tbody></table>" +
  "<script>alert('removed by the sanitiser')</script>";

function initial(): State {
  const state: State = {
    offers: new Map(),
    offerVersions: new Map(),
    templates: new Map(),
    templateVersions: new Map(),
    snapshots: [
      { revision: 1, source_url: "https://example.com/terms", fetched_at: "2026-10-01T09:00:00+00:00", sha256: "0".repeat(64), html: TERMS_HTML },
    ],
  };
  for (const o of OFFERS) {
    state.offers.set(o.offer_id, o);
    state.offerVersions.set(o.offer_id, [{ revision: 1, saved_at: STAMP, action: "sample", payload: o }]);
  }
  for (const tpl of TEMPLATES) {
    state.templates.set(tpl.template_id, tpl);
    state.templateVersions.set(tpl.template_id, [{ revision: 1, saved_at: STAMP, action: "sample", payload: tpl }]);
  }
  return state;
}

const g = globalThis as unknown as { __skFixtures?: State };
const state = (): State => (g.__skFixtures ??= initial());

const toPublic = (o: OfferRecord): PublicOffer => ({
  offer_id: o.offer_id, revision: o.revision ?? 1, updated_at: o.updated_at ?? "", name: o.name, category: o.category,
  description: o.description, benefits: o.benefits, eligibility: o.eligibility, restrictions: o.restrictions,
  exclusions: o.exclusions, terms: o.terms, tc_url: o.tc_url, original_source: o.original_source, keywords: o.keywords,
  calculation_rules: o.calculation_rules, notes: o.notes, notice_period: o.notice_period,
  schedule_details: o.schedule_details, launch_date: o.launch_date, launch_date_evidence: o.launch_date_evidence,
  wallet_activation_date: o.wallet_activation_date, wallet_activation_details: o.wallet_activation_details,
  lifecycle: o.lifecycle,
});

const toPublicTemplate = (t: TemplateRecord): PublicTemplate => ({
  template_id: t.template_id, revision: t.revision, title: t.title, category: t.category, path: t.path,
  source: t.source, start: t.start, blocks: t.blocks, paragraphs: t.paragraphs,
});

const visibleOffers = () => [...state().offers.values()].filter((o) => !o.deleted && !o.fictional);

export const fixturePublicRepo: PublicRepo = {
  async offers() {
    return visibleOffers().map(toPublic).sort((a, b) => a.name.localeCompare(b.name));
  },
  async offer(id) {
    const o = state().offers.get(id);
    return o && !o.deleted && !o.fictional ? toPublic(o) : null;
  },
  async templates() {
    return [...state().templates.values()].filter((x) => !x.deleted).map(toPublicTemplate).sort((a, b) => a.start - b.start);
  },
  async template(id) {
    const x = state().templates.get(id);
    return x && !x.deleted ? toPublicTemplate(x) : null;
  },
  async terms() {
    const latest = state().snapshots[0];
    return latest ? { ...latest, sha256: undefined } : null;
  },
};

export const fixtureAdminRepo: AdminRepo = {
  async counts() {
    const s = state();
    const all = [...s.offers.values()];
    return {
      offers: all.filter((o) => !o.deleted).length,
      offersDeleted: all.filter((o) => o.deleted).length,
      templates: [...s.templates.values()].filter((x) => !x.deleted).length,
      snapshots: s.snapshots.length,
      documents: 0,
    };
  },
  async listOffers(includeDeleted) {
    return [...state().offers.values()].filter((o) => includeDeleted || !o.deleted).sort((a, b) => a.name.localeCompare(b.name));
  },
  async getOffer(id) {
    return state().offers.get(id) ?? null;
  },
  async offerHistory(id) {
    return [...(state().offerVersions.get(id) ?? [])].sort((a, b) => b.revision - a.revision);
  },
  async saveOffer(record, expected, action) {
    const s = state();
    const key = [...s.offers.keys()].find((k) => k.toLowerCase() === record.offer_id.toLowerCase());
    const current = key ? s.offers.get(key) : undefined;
    if (current) {
      if (expected === null) throw new RepoError("Offer ID already exists. Open it in the editor to create a new revision.");
      if ((current.revision ?? 0) !== expected) throw new RepoError("This offer changed in another session. Reload before saving.");
    } else if (expected !== null) {
      throw new RepoError("This offer changed in another session. Reload before saving.");
    }
    const revision = (current?.revision ?? 0) + 1;
    const saved: OfferRecord = { ...record, offer_id: current?.offer_id ?? record.offer_id, revision, updated_at: new Date().toISOString() };
    s.offers.set(saved.offer_id, saved);
    s.offerVersions.set(saved.offer_id, [...(s.offerVersions.get(saved.offer_id) ?? []), { revision, saved_at: saved.updated_at!, action, payload: saved }]);
    return saved;
  },
  async listTemplates(includeDeleted) {
    return [...state().templates.values()].filter((x) => includeDeleted || !x.deleted).sort((a, b) => a.start - b.start);
  },
  async getTemplate(id) {
    return state().templates.get(id) ?? null;
  },
  async templateHistory(id) {
    return [...(state().templateVersions.get(id) ?? [])].sort((a, b) => b.revision - a.revision);
  },
  async saveTemplate(record, expected, action) {
    const s = state();
    const current = s.templates.get(record.template_id);
    if (current) {
      if (expected === null) throw new RepoError("Template ID already exists.");
      if (current.revision !== expected) throw new RepoError("This template changed in another session. Reload before saving.");
    } else if (expected !== null) {
      throw new RepoError("This template changed in another session. Reload before saving.");
    }
    const revision = (current?.revision ?? 0) + 1;
    const saved = { ...record, revision };
    s.templates.set(saved.template_id, saved);
    s.templateVersions.set(saved.template_id, [...(s.templateVersions.get(saved.template_id) ?? []), { revision, saved_at: new Date().toISOString(), action, payload: saved }]);
    return saved;
  },
  async snapshots() {
    return [...state().snapshots];
  },
  async addSnapshot(html, sourceUrl) {
    const s = state();
    if (!html.trim()) throw new RepoError("Official terms content is empty.");
    if (s.snapshots[0]?.html === html) return s.snapshots[0].revision;
    const revision = (s.snapshots[0]?.revision ?? 0) + 1;
    s.snapshots.unshift({ revision, source_url: sourceUrl, fetched_at: new Date().toISOString(), sha256: "f".repeat(64), html });
    return revision;
  },
  async deleteSnapshot(revision) {
    const s = state();
    const before = s.snapshots.length;
    s.snapshots = s.snapshots.filter((x) => x.revision !== revision);
    if (s.snapshots.length === before) throw new RepoError("Snapshot not found.");
  },
  async documents(): Promise<(SourceDocument & { url: string | null })[]> {
    return [];
  },
};
