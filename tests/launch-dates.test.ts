import { describe, expect, it } from "vitest";
import { extractTitle, isAllowedGtoUrl, lookupLaunchDate, titleDate } from "@/lib/launch-dates";

describe("title date precision (cases from tests/test_launch_dates.py)", () => {
  it.each([
    ["Magic Pass 2026 T&C 10/02/26 - GTO", "2026-02-10"],
    ["T&Cs 7 January 2026", "2026-01-07"],
    ["16th June 2025", "2025-06-16"],
    ["Winter Voucher T&Cs 16 Sep2025", "2025-09-16"],
    ["Trip Key T&Cs 8 September25", "2025-09-08"],
    ["GTO Flight Pass T&C 061026", "2026-10-06"],
    ["Magic Pass T&Cs. (11-2025)", "2025-11"],
    ["June 2025", "2025-06"],
    ["Winter Voucher Aug 25", "2025-08"],
    ["2 For 1 Card 15 - 27 Jan 26", "2026-01-15 to 2026-01-27"],
    ["Free Hotel 2026", "N/A"],
    ["Save 33% 28 Aug", "N/A"],
    ["T&C 31/02/26", "N/A"],
    ["No dated heading", "N/A"],
  ])("%s -> %s", (title, expected) => {
    expect(titleDate(title)[0]).toBe(expected);
  });

  it("always explains what the date is, and is not", () => {
    expect(titleDate("T&Cs 7 January 2026")[1]).toMatch(/not separately confirmed/);
    expect(titleDate("June 2025")[1]).toMatch(/exact launch day not stated/);
  });
});

describe("official-host restriction", () => {
  it("allows only https GTO hosts without credentials or odd ports", () => {
    expect(isAllowedGtoUrl("https://link.gtomembers.com/magic-pass/")).toBe(true);
    expect(isAllowedGtoUrl("https://gtomembers.com/terms-conditions")).toBe(true);
    for (const bad of [
      "http://gtomembers.com/",
      "https://example.com/10-02-26",
      "https://gtomembers.com.evil.test/",
      "https://user:pw@gtomembers.com/",
      "https://gtomembers.com:8443/",
      "http://localhost:3000",
      "javascript:alert(1)",
      "not a url",
    ]) {
      expect(isAllowedGtoUrl(bad), bad).toBe(false);
    }
  });

  it("makes no network request for unapproved hosts", async () => {
    expect((await lookupLaunchDate("http://localhost:8501"))[0]).toBe("N/A");
    expect((await lookupLaunchDate("https://example.com/10-02-26"))[0]).toBe("N/A");
  });
});

describe("title extraction", () => {
  it("decodes entities so T&amp;C titles are readable", () => {
    expect(extractTitle("<html><title> Magic Pass T&amp;Cs\n 10/02/26 </title>")).toBe("Magic Pass T&Cs 10/02/26");
    expect(extractTitle("<title>It&#39;s &quot;on&quot;</title>")).toBe('It\'s "on"');
    expect(extractTitle("<p>no title</p>")).toBe("");
  });
});
