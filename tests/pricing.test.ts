import { describe, expect, it } from "vitest";
import { cityTax, display, excelText, roomDifference, SOURCE, walletDiscount } from "@/lib/pricing";
import { D, parseNumber } from "@/lib/number";

const e = SOURCE.examples;
const values = (r: { values: Record<string, unknown> }) => Object.values(r.values).map(String);

describe("workbook cached examples (same figures as the Python suite)", () => {
  it("room price difference", () => {
    const r = roomDifference(e.B6, e.C6);
    expect(String(r.values.Difference)).toBe(String(e.D6));
    expect(Number(r.values["Percentage vs client price"])).toBeCloseTo(e.E6, 12);
  });

  it("city tax", () => {
    const r = cityTax(e.B20, e.C20);
    expect(Number(r.values["City tax percentage"])).toBeCloseTo(e.D20, 12);
    expect(String(r.values["Quotation total"])).toBe(String(e.F20));
    expect(r.action).toBe(e.E20);
    expect(r.parameter).toBe(e.G20);
  });

  it("wallet discount", () => {
    const r = walletDiscount(e.B34, e.C34, e.D34 * 100);
    expect(values(r)).toEqual([e.E34, e.F34, e.G34, e.H34, e.I34].map(String));
  });
});

describe("city tax threshold uses the unrounded value", () => {
  it.each([
    ["3.99", "103.99", true],
    ["4", "104", true],
    ["4.00001", "100", false],
  ])("tax %s -> total %s (included=%s)", (tax, total, included) => {
    const r = cityTax("100", tax);
    expect(String(r.values["Quotation total"])).toBe(total);
    expect(r.parameter!.includes("included in")).toBe(included);
  });

  it("accepts an overridden threshold", () => {
    expect(String(cityTax("100", "5", "5").values["Quotation total"])).toBe("105");
    expect(String(cityTax("100", "5", "4").values["Quotation total"])).toBe("100");
  });
});

describe("wallet boundaries", () => {
  it.each([
    ["100", "100", "75", [100, 75, 25, 0, 25]],
    ["400", "0", "75", [0, 0, 0, 400, 400]],
    ["400", "60", "0", [60, 0, 60, 340, 400]],
    ["0", "60", "75", [0, 0, 0, 0, 0]],
  ])("booking %s wallet %s discount %s%%", (booking, wallet, discount, expected) => {
    expect(values(walletDiscount(booking, wallet, discount))).toEqual((expected as number[]).map(String));
  });
});

describe("invalid input and undefined formulas", () => {
  it.each(["", null, undefined, "abc", "NaN", "Infinity", "1e100", true, "1,000", "--5", "."])(
    "rejects %j",
    (bad) => {
      expect(() => roomDifference(bad, "100")).toThrow();
    },
  );

  it("handles zero divisors explicitly", () => {
    const r = roomDifference("0", "20");
    expect(String(r.values.Difference)).toBe("20");
    expect(r.values["Percentage vs client price"]).toBeNull();
    expect(() => cityTax("0", "20")).toThrow(/zero/);
    expect(() => walletDiscount("100", "20", "100")).toThrow(/100%/);
  });

  it("rejects discounts outside 0-100 (deliberate guard beyond the Python version)", () => {
    expect(() => walletDiscount("100", "20", "150")).toThrow(/between 0 and 100/);
    expect(() => walletDiscount("100", "20", "-5")).toThrow(/between 0 and 100/);
  });

  it("limits precision and size like the Python parser", () => {
    expect(() => parseNumber("1".repeat(33))).toThrow();
    expect(() => parseNumber("0." + "0".repeat(33) + "1")).toThrow();
    expect(parseNumber(" 12.50 ").eq(12.5)).toBe(true);
    expect(parseNumber("1e5").eq(100000)).toBe(true);
  });
});

describe("display and rounding", () => {
  it("rounds half away from zero to 2 decimals", () => {
    expect(display(new D("1.005"))).toBe("1.01");
    expect(display(new D("-1.005"))).toBe("-1.01");
    expect(display(new D("1234567.891"))).toBe("1,234,567.89");
    expect(display(new D("-0.001"))).toBe("0.00");
    expect(display(null)).toBe("Unavailable");
    expect(display(new D(".0400001"), true)).toBe("4.00%");
  });

  it("formats parameter text like the workbook's ROUND()", () => {
    expect(excelText(new D("511.5"))).toBe("511.5");
    expect(excelText(new D("100"))).toBe("100");
    expect(excelText(new D("0.001"))).toBe("0");
    expect(excelText(new D("3.0359"))).toBe("3.04");
  });

  it("negative price difference", () => {
    expect(String(roomDifference("200", "100").values.Difference)).toBe("-100");
  });
});
