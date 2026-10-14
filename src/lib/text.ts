/** Small text helpers shared by the public pages, the admin forms and the tests. */

/** Letters, digits and underscore in any script (Python's `\w`, but Arabic-aware). */
const WORD = /[\p{L}\p{N}_]+/gu;

export function words(text: string): string[] {
  return text.toLowerCase().match(WORD) ?? [];
}

/** Blank or the explicit "N/A" placeholder the offer form writes for empty fields. */
export function isNA(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  return v === "" || v.toUpperCase() === "N/A";
}

/** Returns the URL only if it is a plain http(s) link; anything else (javascript:, data:, ...) is dropped. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v || /\s/.test(v)) return null;
  try {
    const url = new URL(v);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Today's calendar date in Cairo as YYYY-MM-DD (the app's reference time zone). */
export function todayCairo(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** "14 Oct 2026, 15:20" in Cairo time; returns the input unchanged if it is not a date. */
export function formatCairo(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** True only for a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}
