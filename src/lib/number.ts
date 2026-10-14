import Decimal from "decimal.js";

/**
 * Exact decimal arithmetic for the calculators: 50 significant digits, half-up rounding and no
 * exponent notation in printed values. All calculator maths goes through this class.
 */
export const D = Decimal.clone({
  precision: 50,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -1e9,
  toExpPos: 1e9,
});
export type Dec = InstanceType<typeof D>;

const NUMBER_TEXT = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;

/**
 * Strict numeric input (ported from knowledge/operation_calculations.number): a plain decimal,
 * finite, at most 1e18 in size, and at most 32 digits / 32 decimal places of precision.
 */
export function parseNumber(value: unknown): Dec {
  if (typeof value === "boolean") throw new Error("Boolean values are not numeric inputs");
  const text = (typeof value === "number" ? String(value) : String(value ?? "")).trim();
  const m = NUMBER_TEXT.exec(text);
  const intPart = m?.[2] ?? "";
  const fracPart = m?.[3] ?? "";
  if (!m || (intPart === "" && fracPart === "")) throw new Error("A valid decimal number is required");
  const digits = (intPart + fracPart).replace(/^0+/, "") || "0";
  const exponent = Number(m[4] ?? 0) - fracPart.length;
  if (digits.length > 32 || Math.abs(exponent) > 32) throw new Error("Number is non-finite, too large, or too precise");
  const d = new D(text);
  if (!d.isFinite() || d.abs().gt("1e18")) throw new Error("Number is non-finite, too large, or too precise");
  return d;
}
