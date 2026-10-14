import { describe, expect, it } from "vitest";
import { blankOffer, cleanOffer, newOfferId, optionalEntry, relevance, searchOffers, validateOffer } from "@/lib/offers";
import type { PublicOffer } from "@/lib/types";

const offer = (o: Partial<PublicOffer>): PublicOffer => ({
  offer_id: "OFF-000000000001", revision: 1, updated_at: "", name: "", category: "Products",
  description: "", benefits: "", eligibility: "", restrictions: "", exclusions: "", terms: "",
  tc_url: "", original_source: "", keywords: "", calculation_rules: "", notes: "", notice_period: "",
  schedule_details: "", launch_date: "", launch_date_evidence: "", wallet_activation_date: "",
  wallet_activation_details: "", lifecycle: "available", ...o,
});

describe("everyday entry is optional", () => {
  it("blank fields save as N/A, hidden metadata is kept, and saves are drafts", () => {
    const saved = optionalEntry({
      offer_id: "OFF-TEST00000001",
      launch_date: "2025-11",
      launch_date_evidence: "Month only in title",
      approval_status: "approved",
      activation_date: "2025-01-01",
      source_version: "Supplied CSV snapshot",
    });
    expect(saved.launch_date).toBe("2025-11");
    expect(saved.wallet_activation_date).toBe("N/A");
    expect(saved.notice_period).toBe("N/A");
    expect(saved.name).toBe("N/A");
    expect(saved.approval_status).toBe("draft");
    expect(saved.activation_date).toBe("2025-01-01"); // hidden metadata preserved
    expect(saved.source_version).toBe("Supplied CSV snapshot");
    expect(validateOffer(saved).offer_id).toBe("OFF-TEST00000001");
  });

  it("generates internal IDs", () => {
    expect(newOfferId()).toMatch(/^OFF-[0-9A-F]{12}$/);
    expect(newOfferId()).not.toBe(newOfferId());
  });
});

describe("cleanOffer", () => {
  it("trims text and rejects non-text values", () => {
    expect(cleanOffer({ name: "  Spaced  " }).name).toBe("Spaced");
    expect(() => cleanOffer({ name: 5 })).toThrow(/must be text/);
    expect(() => cleanOffer({ deleted: "yes" })).toThrow(/true or false/);
    expect(() => cleanOffer({ attachment_ids: ["x"] })).toThrow(/attachment/);
  });

  it("drops unknown keys", () => {
    expect(Object.keys(cleanOffer({ evil: "x" }))).not.toContain("evil");
  });
});

describe("validateOffer", () => {
  const ok = () => ({ ...blankOffer(), offer_id: "OFF-TEST00000001", name: "n", category: "c", description: "d" });

  it("accepts a minimal record", () => {
    expect(() => validateOffer(ok())).not.toThrow();
  });

  it.each([
    [{ offer_id: "ab" }, /Offer ID/],
    [{ tc_url: "javascript:alert(1)" }, /http or https/],
    [{ tc_url: "https://user:pw@example.com" }, /http or https/],
    [{ original_source: "ftp://x" }, /URL or document/],
    [{ activation_date: "2025-02-30" }, /valid calendar date/],
    [{ activation_date: "01/02/2025" }, /YYYY-MM-DD/],
    [{ no_expiry: true, expiry_date: "2026-01-01" }, /not both/],
    [{ activation_date: "2026-02-01", expiry_date: "2026-01-01" }, /cannot precede activation/],
    [{ last_verified_date: "2999-01-01" }, /future/],
    [{ lifecycle: "gone" }, /Invalid approval status or lifecycle/],
  ])("rejects %j", (patch, message) => {
    expect(() => validateOffer({ ...ok(), ...patch })).toThrow(message);
  });

  it("allows N/A for links and the wallet date", () => {
    expect(() => validateOffer({ ...ok(), tc_url: "N/A", original_source: "N/A", wallet_activation_date: "N/A" })).not.toThrow();
    expect(() => validateOffer({ ...ok(), original_source: "document:credits.csv" })).not.toThrow();
  });
});

describe("search", () => {
  const rows = [
    offer({ offer_id: "OFF-A", name: "Flight Club Card", description: "Save on flights", keywords: "flight club" }),
    offer({ offer_id: "OFF-B", name: "Hotel Pass", description: "Hotels with a flight option" }),
    offer({ offer_id: "OFF-C", name: "Wallet Boost", category: "Promotions", notice_period: "14 days" }),
  ];

  it("weights name hits above other fields and sorts by score then name", () => {
    expect(searchOffers(rows, { query: "flight" }).map((o) => o.offer_id)).toEqual(["OFF-A", "OFF-B"]);
  });

  it("returns everything for a blank query and filters by category", () => {
    expect(searchOffers(rows, {})).toHaveLength(3);
    expect(searchOffers(rows, { category: "Promotions" }).map((o) => o.offer_id)).toEqual(["OFF-C"]);
  });

  it("matches an exact offer ID first and ignores stop words", () => {
    expect(relevance(rows[2], "off-c")).toBe(1000);
    // "what", "are" and "the" are stop words; "14" and "days" match the notice period text.
    expect(searchOffers(rows, { query: "what are the 14 days" }).map((o) => o.offer_id)).toEqual(["OFF-C"]);
  });

  it("matches whole words, so a fragment finds nothing", () => {
    expect(searchOffers(rows, { query: "fligh" })).toHaveLength(0);
  });
});
