/**
 * Reads the date written in a public GTO T&C page TITLE (ported from knowledge/launch_dates.py).
 * Never infers anything from URL slugs, travel dates or expiry dates; a title date is not proof of
 * an actual launch. Network access is limited to the official GTO hosts.
 */
import { readLimited } from "./http";

const MONTH_NAMES: [string, ...string[]][] = [
  ["jan", "january"], ["feb", "february"], ["mar", "march"], ["apr", "april"], ["may"],
  ["jun", "june"], ["jul", "july"], ["aug", "august"], ["sep", "sept", "september"],
  ["oct", "october"], ["nov", "november"], ["dec", "december"],
];
const MONTHS: Record<string, number> = {};
MONTH_NAMES.forEach((names, i) => names.forEach((n) => (MONTHS[n] = i + 1)));
const MONTH = "(?:" + Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|") + ")";

export type TitleDate = [value: string, note: string];

function iso(day: string, month: number | string, year: string): string {
  let y = Number(year);
  if (y < 100) y += 2000;
  const m = Number(month);
  const d = Number(day);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    throw new RangeError("invalid calendar date");
  }
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function titleDate(title: string): TitleDate {
  const text = title.toLowerCase();
  try {
    let m = new RegExp(`\\b(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})\\s+(${MONTH})\\s*(\\d{4}|\\d{2})\\b`).exec(text);
    if (m) {
      const [, a, b, month, y] = m;
      return [
        `${iso(a, MONTHS[month], y)} to ${iso(b, MONTHS[month], y)}`,
        "Date range in T&C title; exact launch day not stated.",
      ];
    }
    m = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH})\\s*(\\d{4}|\\d{2})\\b`).exec(text);
    if (m) return [iso(m[1], MONTHS[m[2]], m[3]), "Date beside the T&C title; launch date not separately confirmed."];
    m = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4}|\d{2})\b/.exec(text);
    if (m) return [iso(m[1], m[2], m[3]), "T&C title date, read as day/month/year; launch date not separately confirmed."];
    m = /\bt&cs?\s*(\d{2})(\d{2})(\d{2})\b/.exec(text);
    if (m) return [iso(m[1], m[2], m[3]), "T&C title date code interpreted as DDMMYY; launch date not separately confirmed."];
    m = new RegExp(`\\b(${MONTH})\\s+(\\d{4}|\\d{2})\\b`).exec(text);
    if (m) {
      let y = Number(m[2]);
      if (y < 100) y += 2000;
      return [`${String(y).padStart(4, "0")}-${String(MONTHS[m[1]]).padStart(2, "0")}`, "Month only in T&C title; exact launch day not stated."];
    }
    m = /\b(0?[1-9]|1[0-2])-(20\d{2})\b/.exec(text);
    if (m) return [`${m[2]}-${String(Number(m[1])).padStart(2, "0")}`, "Month only in T&C title; exact launch day not stated."];
  } catch {
    return ["N/A", "The title contains an invalid or ambiguous calendar date."];
  }
  return ["N/A", "No complete date or month/year found in the T&C title."];
}

const ALLOWED_HOSTS = new Set(["link.gtomembers.com", "gtomembers.com", "www.gtomembers.com"]);

export function isAllowedGtoUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname) && !u.username && !u.password &&
      (u.port === "" || u.port === "443");
  } catch {
    return false;
  }
}

function decodeEntities(text: string): string {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : whole;
    }
    return named[body.toLowerCase()] ?? whole;
  });
}

export function extractTitle(html: string): string {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? decodeEntities(m[1]).replace(/\s+/g, " ").trim() : "";
}

/** Fetches an official page, following redirects only while they stay on official hosts. */
export async function lookupLaunchDate(url: string): Promise<TitleDate> {
  try {
    if (!isAllowedGtoUrl(url)) return ["N/A", "No supported official GTO T&C link supplied."];
    let current = url;
    for (let hop = 0; hop < 5; hop++) {
      const response = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
        headers: { "User-Agent": "SupportKnowledge-Web/1.0" },
        cache: "no-store",
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Redirect without a target");
        current = new URL(location, current).toString();
        if (!isAllowedGtoUrl(current)) throw new Error("Redirect is outside the official GTO website");
        continue;
      }
      if (!response.ok) throw new Error("Page not readable");
      const title = extractTitle(new TextDecoder("utf-8").decode(await readLimited(response, 2_000_000)));
      const [value, note] = titleDate(title);
      return [value, `${note} Source title: ${title} | ${url}`];
    }
    throw new Error("Too many redirects");
  } catch {
    return ["N/A", "T&C page could not be read. Date not determined."];
  }
}
