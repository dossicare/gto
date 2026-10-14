/**
 * Deterministic translations of the supplied GTO_Pricing_Calculators workbook (Calculators sheet),
 * ported from knowledge/pricing.py. No spreadsheet is executed and no rate is assumed.
 * Source cells are cited with every result.
 */
import { D, parseNumber, type Dec } from "./number";

export const SOURCE = {
  filename: "GTO_Pricing_Calculators 2.xlsx",
  sheet: "Calculators",
  /** The workbook's editable threshold in cell I18 (0.04), shown as a percentage. */
  thresholdCell: "I18",
  thresholdPercent: "4",
  examples: {
    B6: 2318.6, C6: 2687.6, D6: 369, E6: 0.15914776158026395,
    B20: 16848.37, C20: 511.5, D20: 0.03035901989331906,
    E20: "Add to total and parameter", F20: 17359.87,
    G20: "City tax of GBP 511.5 (3.04%) is included in the quotation total and added as a parameter.",
    B34: 400, C34: 60, D34: 0.75, E34: 240, F34: 180, G34: 60, H34: 160, I34: 220,
  },
} as const;

export const ROUNDING =
  "Amounts and percentages display to 2 decimal places, half away from zero. Intermediate values and threshold comparisons are not rounded. Decimal arithmetic uses 50-digit precision.";

export interface CalcResult {
  values: Record<string, Dec | null>;
  steps: string[];
  cells: string;
  inputs: Record<string, Dec>;
  action?: string;
  parameter?: string;
}

function inputs(values: Record<string, unknown>): Record<string, Dec> {
  const result: Record<string, Dec> = {};
  for (const [label, value] of Object.entries(values)) {
    const name = label.replace(/_/g, " ");
    if (value === null || value === undefined || String(value).trim() === "") {
      throw new Error(`Enter ${name}.`);
    }
    try {
      result[label] = parseNumber(value);
    } catch (e) {
      throw new Error(`${name}: ${(e as Error).message}`);
    }
  }
  return result;
}

const withCommas = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** "1,234.57" (half away from zero); "Unavailable" when there is no value; a percent sign if asked. */
export function display(value: Dec | null, percent = false): string {
  if (value === null) return "Unavailable";
  const v = percent ? value.times(100) : value;
  const fixed = v.toDecimalPlaces(2, D.ROUND_HALF_UP).toFixed(2);
  const negative = fixed.startsWith("-") && Number(fixed) !== 0;
  const [whole, fraction] = fixed.replace("-", "").split(".");
  return (negative ? "-" : "") + withCommas(whole) + "." + fraction + (percent ? "%" : "");
}

/** The workbook's ROUND(x,2) concatenated into text: no trailing zeros ("511.5", "100", "0"). */
export function excelText(value: Dec): string {
  const rounded = value.toDecimalPlaces(2, D.ROUND_HALF_UP);
  if (rounded.isZero()) return "0";
  const fixed = rounded.toFixed(2).replace("-0.00", "0");
  return fixed.replace(/0+$/, "").replace(/\.$/, "");
}

export function roomDifference(clientPrice: unknown, yourPrice: unknown): CalcResult {
  const v = inputs({ client_price: clientPrice, your_price: yourPrice });
  const a = v.client_price;
  const b = v.your_price;
  const difference = b.minus(a);
  const ratio = a.isZero() ? null : difference.div(a);
  return {
    values: { Difference: difference, "Percentage vs client price": ratio },
    steps: [
      `Your price - client price = ${b} - ${a} = ${difference}`,
      ratio ? `Difference / client price = ${ratio}` : "Percentage unavailable: client price is zero.",
    ],
    cells: "B6:E6",
    inputs: v,
  };
}

export function cityTax(roomPrice: unknown, cityTaxPrice: unknown, thresholdPercent: unknown = SOURCE.thresholdPercent): CalcResult {
  const v = inputs({ room_price: roomPrice, city_tax_price: cityTaxPrice, threshold_percent: thresholdPercent });
  const room = v.room_price;
  const tax = v.city_tax_price;
  const threshold = v.threshold_percent;
  if (room.isZero()) {
    throw new Error("City tax percentage and quotation decision are unavailable when room price is zero.");
  }
  const ratio = tax.div(room);
  const included = ratio.lte(threshold.div(100));
  const total = included ? room.plus(tax) : room;
  const action = included ? "Add to total and parameter" : "Exclude from total; add to parameter";
  const parameter =
    `City tax of GBP ${excelText(tax)} (${excelText(ratio.times(100))}%) is ` +
    `${included ? "included in" : "excluded from"} the quotation total and added as a parameter.`;
  return {
    values: { "City tax percentage": ratio, "Quotation total": total },
    action,
    parameter,
    steps: [
      `City tax / room price = ${tax} / ${room} = ${ratio}`,
      `Compare unrounded tax percentage with ${threshold}%: ${included ? "at or below" : "above"}`,
      `Quotation total = ${room}${included ? ` + ${tax}` : ""} = ${total}`,
    ],
    cells: "B20:G20; threshold I18; rule A46",
    inputs: v,
  };
}

export function walletDiscount(bookingPrice: unknown, walletBalance: unknown, discountPercent: unknown): CalcResult {
  const v = inputs({ booking_price: bookingPrice, wallet_balance: walletBalance, discount_percent: discountPercent });
  const booking = v.booking_price;
  const wallet = v.wallet_balance;
  const percent = v.discount_percent;
  const rate = percent.div(100);
  if (rate.eq(1)) {
    throw new Error("A 100% discount divides by zero in this workbook formula. Enter a different rate.");
  }
  if (percent.lt(0) || percent.gt(100)) throw new Error("Enter a discount between 0 and 100.");
  const covered = D.min(booking, wallet.div(new D(1).minus(rate)));
  const discount = covered.times(rate);
  const deduction = covered.minus(discount);
  const remaining = D.max(booking.minus(covered), 0);
  const total = deduction.plus(remaining);
  return {
    values: {
      "Maximum booking value covered": covered,
      "Discount amount": discount,
      "Wallet deduction": deduction,
      "Amount without discount": remaining,
      "Total client cost": total,
    },
    steps: [
      `Minimum of booking price and wallet / (1 - discount rate) = min(${booking}, ${wallet} / (1 - ${rate})) = ${covered}`,
      `Discount amount = ${covered} x ${rate} = ${discount}`,
      `Wallet deduction = ${covered} - ${discount} = ${deduction}`,
      `Amount without discount = max(${booking} - ${covered}, 0) = ${remaining}`,
      `Total client cost = ${deduction} + ${remaining} = ${total}`,
    ],
    cells: "B34:I34",
    inputs: v,
  };
}
