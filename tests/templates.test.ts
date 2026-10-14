import { describe, expect, it } from "vitest";
import { figureDifferences, languageOf, normal, searchTemplates } from "@/lib/templates";
import { sanitizeTerms } from "@/lib/sanitize";
import type { PublicTemplate, TemplateBlock } from "@/lib/types";

const block = (kind: TemplateBlock["kind"], text: string): TemplateBlock => ({ kind, paragraphs: [{ number: 1, text }] });
const template = (id: string, path: string, blocks: TemplateBlock[], start = 1): PublicTemplate => ({
  template_id: id, revision: 1, title: path, category: path.split(" / ")[0], path, source: "x.docx", start, blocks, paragraphs: [],
});

describe("Arabic-aware search normalisation", () => {
  it("ignores diacritics, tatweel and alef/yeh variants but keeps the original text untouched", () => {
    expect(normal("إلغاء")).toBe(normal("الغاء"));
    expect(normal("مُحفَظة")).toBe(normal("محفظة"));
    expect(normal("مـحفظة")).toBe(normal("محفظة"));
    expect(normal("على")).toBe(normal("علي"));
    expect(normal("Wallet, Cancellation!")).toBe("wallet cancellation");
  });

  it("detects the language of a paragraph", () => {
    expect(languageOf("Dear customer")).toBe("English");
    expect(languageOf("عزيزي العميل")).toBe("Arabic");
  });
});

describe("template search", () => {
  const rows = [
    template("A", "Wallet / Missing credit", [block("English", "Your wallet credit will arrive in 14 days"), block("Arabic", "سيصل رصيد المحفظة خلال ١٤ يوما")], 5),
    template("B", "Cancellation / Refund", [block("English", "We have cancelled your booking")], 2),
  ];

  it("finds Arabic with different spelling and filters by language and situation", () => {
    expect(searchTemplates(rows, { query: "المحفظه" }).map((t) => t.template_id)).toEqual([]); // ه vs ة is NOT folded
    expect(searchTemplates(rows, { query: "المحفظة" }).map((t) => t.template_id)).toEqual(["A"]);
    expect(searchTemplates(rows, { lang: "Arabic" }).map((t) => t.template_id)).toEqual(["A"]);
    expect(searchTemplates(rows, { category: "Cancellation" }).map((t) => t.template_id)).toEqual(["B"]);
  });

  it("requires every term, and ranks title hits first", () => {
    expect(searchTemplates(rows, { query: "wallet 14" }).map((t) => t.template_id)).toEqual(["A"]);
    expect(searchTemplates(rows, { query: "wallet refund" })).toHaveLength(0);
    expect(searchTemplates(rows, { query: "booking cancellation" }).map((t) => t.template_id)).toEqual(["B"]);
  });

  it("orders ties by position in the source document", () => {
    expect(searchTemplates(rows, {}).map((t) => t.template_id)).toEqual(["B", "A"]);
  });
});

describe("figure differences", () => {
  it("is quiet when English and Arabic use the same figures (Arabic-Indic digits are read)", () => {
    expect(figureDifferences([block("English", "within 14 days"), block("Arabic", "خلال ١٤ يوما")])).toBeNull();
  });

  it("flags different figures for comparison, not as proof of an error", () => {
    expect(figureDifferences([block("English", "within 14 days"), block("Arabic", "خلال ٣٠ يوما")])).toEqual({
      English: ["14"],
      Arabic: ["30"],
    });
  });

  it("does nothing when only one language is present", () => {
    expect(figureDifferences([block("English", "within 14 days")])).toBeNull();
  });
});

describe("official terms sanitiser", () => {
  it("keeps readable formatting and checked links", () => {
    const out = sanitizeTerms('<h2>Terms</h2><p>See <a href="https://gtomembers.com/x">here</a> <strong>now</strong></p><ul><li>One</li></ul>');
    expect(out).toContain("<h2>Terms</h2>");
    expect(out).toContain('href="https://gtomembers.com/x"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain("<li>One</li>");
  });

  it.each([
    ['<script>alert(1)</script><p>ok</p>', "alert"],
    ['<p onclick="alert(1)">x</p>', "onclick"],
    ['<a href="javascript:alert(1)">x</a>', "javascript"],
    ['<a href="data:text/html,<script>alert(1)</script>">x</a>', "data:"],
    ['<iframe src="https://evil.test"></iframe><p>ok</p>', "iframe"],
    ['<style>body{display:none}</style><p>ok</p>', "display"],
    ['<img src=x onerror=alert(1)>', "onerror"],
    ['<object data="x"></object>', "object"],
    ['<a href="//evil.test">x</a>', "//evil"],
  ])("neutralises %s", (html, forbidden) => {
    expect(sanitizeTerms(html).toLowerCase()).not.toContain(forbidden);
  });
});
