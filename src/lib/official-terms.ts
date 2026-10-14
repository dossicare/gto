import { readLimited } from "./http";

/** Public page people read, and the public endpoint that page loads its clauses from. */
export const OFFICIAL_TERMS_URL = "https://gtomembers.com/terms-conditions";
const SITE_CONFIG = "https://api-panel.gtomembers.com/en/api/site-config/";

/**
 * Fetches the published general terms (HTML) from the official site. The address is fixed: nothing
 * typed by a person ever becomes a URL here. The HTML is stored as received and sanitised when shown.
 */
export async function fetchOfficialTerms(): Promise<string> {
  const response = await fetch(SITE_CONFIG, {
    headers: { "User-Agent": "SupportKnowledge-Web/1.0", Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
    redirect: "error",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("The official site did not respond. Try again later.");
  const body = await readLimited(response, 3_000_000);
  let html: unknown;
  try {
    html = (JSON.parse(new TextDecoder("utf-8").decode(body)) as { terms_and_conditions?: unknown }).terms_and_conditions;
  } catch {
    throw new Error("The official site returned something unexpected.");
  }
  if (typeof html !== "string" || !html.trim()) throw new Error("The official site returned no terms text.");
  return html;
}
