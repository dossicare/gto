/**
 * Template rules ported from knowledge/templates.py: Arabic-aware search normalisation and the
 * "different figures" comparison. Displayed text is never rewritten; only the search copy is.
 */
import type { PublicTemplate, TemplateBlock, TemplateKind } from "./types";

const ARABIC_MARKS = /[ً-ٰٟـ]/g; // diacritics and tatweel
const WORD = /[\p{L}\p{N}_]+/gu;

/** Search copy of a string: NFKC, lower-case, no Arabic diacritics, unified alef/yeh forms. */
export function normal(text: string): string {
  const folded = text
    .normalize("NFKC")
    .toLowerCase()
    .replace(ARABIC_MARKS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي");
  return (folded.match(WORD) ?? []).join(" ");
}

export function languageOf(text: string): "Arabic" | "English" {
  return /[؀-ۿ]/.test(text) ? "Arabic" : "English";
}

function bodyText(blocks: TemplateBlock[]): string {
  return blocks.flatMap((b) => b.paragraphs.map((p) => p.text)).join(" ");
}

export function searchTemplates(
  templates: PublicTemplate[],
  { query = "", category = "", lang = "" }: { query?: string; category?: string; lang?: string } = {},
): PublicTemplate[] {
  const terms = normal(query).split(" ").filter(Boolean);
  const found: { score: number; template: PublicTemplate }[] = [];
  for (const template of templates) {
    if (category && template.category !== category) continue;
    if (lang && !template.blocks.some((b) => b.kind === lang)) continue;
    const title = normal(template.path);
    const body = normal(bodyText(template.blocks));
    if (!terms.every((t) => title.includes(t) || body.includes(t))) continue;
    const score = terms.reduce((sum, t) => sum + (title.includes(t) ? 4 : 1), 0);
    found.push({ score, template });
  }
  return found
    .sort((a, b) => b.score - a.score || a.template.start - b.template.start)
    .map((x) => x.template);
}

const EASTERN_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function figures(text: string): Map<string, number> {
  const ascii = text.replace(/[٠-٩]/g, (d) => String(EASTERN_DIGITS.indexOf(d)));
  const counts = new Map<string, number>();
  for (const token of ascii.match(/\d+(?:[.,]\d+)?/g) ?? []) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

function sameCounts(a: Map<string, number>, b: Map<string, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) if (b.get(key) !== value) return false;
  return true;
}

/**
 * Written numbers that differ between the English and Arabic text. This is a prompt to compare the
 * two scripts, not proof of a translation error (a number written as a word also triggers it).
 */
export function figureDifferences(blocks: TemplateBlock[]): Record<"English" | "Arabic", string[]> | null {
  const kinds: Exclude<TemplateKind, "Notes">[] = ["English", "Arabic"];
  const counts = {} as Record<"English" | "Arabic", Map<string, number>>;
  for (const kind of kinds) {
    counts[kind] = figures(
      blocks.filter((b) => b.kind === kind).flatMap((b) => b.paragraphs.map((p) => p.text)).join(" "),
    );
  }
  const both = kinds.every((kind) => blocks.some((b) => b.kind === kind));
  if (!both || sameCounts(counts.English, counts.Arabic)) return null;
  return { English: [...counts.English.keys()], Arabic: [...counts.Arabic.keys()] };
}
