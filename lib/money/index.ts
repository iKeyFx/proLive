/**
 * lib/money — the single source of truth for monetary arithmetic.
 *
 * RULES (enforced by convention + branded types):
 *  1. Every monetary value is an INTEGER in minor units (kobo). 1 naira = 100 kobo.
 *     Floating-point money is forbidden everywhere in the app.
 *  2. Quantities may be fractional, so they are stored as INTEGER micro-units
 *     (QTY_SCALE = 1e6). 1.5 units === 1_500_000 micro-units.
 *  3. We never store a *rounded average price*. We store the integer cost basis
 *     (sum of kobo actually paid) and the integer quantity. The average entry is
 *     a derived display value: costBasis / qty. This means no rounding drift can
 *     ever accumulate in storage — sums are exact.
 *
 * ROUNDING POLICY (the one place division happens):
 *   `divRound` rounds half AWAY FROM ZERO ("commercial rounding"). It is applied
 *   only when converting price × quantity into integer kobo, and when
 *   apportioning cost basis on a partial sell. The rounded result *is* the
 *   recorded value, so reconciliation (cash delta === recorded cost) is exact by
 *   construction. We document this rather than hide it.
 */

// ── Branded types — make it a compile error to mix kobo with raw numbers ────
export type Kobo = number & { readonly __brand: "Kobo" };
/** Quantity in micro-units (1e6 == 1.0 unit). Integer. */
export type QtyMicro = number & { readonly __brand: "QtyMicro" };

export const KOBO_PER_NAIRA = 100;
export const QTY_SCALE = 1_000_000;

// ── Constructors / guards ───────────────────────────────────────────────────
export function kobo(n: number): Kobo {
  if (!Number.isInteger(n)) {
    throw new RangeError(`kobo() requires an integer, got ${n}`);
  }
  return n as Kobo;
}

export function qtyMicro(n: number): QtyMicro {
  if (!Number.isInteger(n)) {
    throw new RangeError(`qtyMicro() requires an integer, got ${n}`);
  }
  return n as QtyMicro;
}

/** Naira (possibly fractional, e.g. user enters 142.30) → integer kobo. */
export function nairaToKobo(naira: number): Kobo {
  return kobo(divRound(Math.round(naira * 1000), 10)); // 3dp guard then to kobo
}

/** Whole/fractional units (e.g. 1.5) → integer micro-units. */
export function unitsToMicro(units: number): QtyMicro {
  return qtyMicro(Math.round(units * QTY_SCALE));
}

// ── Core integer division with documented rounding ──────────────────────────
/**
 * Integer division rounded half away from zero.
 * divRound(5, 2) === 3 ; divRound(-5, 2) === -3 ; divRound(4, 2) === 2.
 */
export function divRound(numerator: number, denominator: number): number {
  if (denominator === 0) throw new RangeError("divRound: division by zero");
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
    throw new RangeError("divRound: operands must be integers");
  }
  const sign = Math.sign(numerator) * Math.sign(denominator);
  const a = Math.abs(numerator);
  const b = Math.abs(denominator);
  const q = Math.floor(a / b);
  const r = a - q * b;
  // round half away from zero: bump when remainder*2 >= denominator
  const rounded = r * 2 >= b ? q + 1 : q;
  return sign < 0 ? -rounded : rounded;
}

// ── Trade math ──────────────────────────────────────────────────────────────
/**
 * Cost (or proceeds) of trading `qty` units at `price` per whole unit.
 *   cost_kobo = round( price_kobo × qty_micro / QTY_SCALE )
 */
export function tradeCost(price: Kobo, qty: QtyMicro): Kobo {
  return kobo(divRound(price * qty, QTY_SCALE));
}

/** Derived average entry price per whole unit, in kobo (display only). */
export function avgEntry(costBasis: Kobo, qty: QtyMicro): Kobo {
  if (qty === 0) return kobo(0);
  return kobo(divRound(costBasis * QTY_SCALE, qty));
}

/** Current market value of a holding: round(price × qty / scale). */
export function marketValue(price: Kobo, qty: QtyMicro): Kobo {
  return tradeCost(price, qty);
}

/** Unrealized P/L = market value − cost basis (integer kobo, can be negative). */
export function unrealizedPnl(price: Kobo, qty: QtyMicro, costBasis: Kobo): Kobo {
  return kobo(marketValue(price, qty) - costBasis);
}

/** P/L as a ratio of cost basis. Returns a plain number (e.g. 0.0123 = +1.23%). */
export function pnlPercent(pnl: Kobo, costBasis: Kobo): number {
  if (costBasis === 0) return 0;
  return pnl / costBasis;
}

// ── Position transitions (pure; the server applies these as the truth) ──────
export interface Position {
  readonly qty: QtyMicro; // total units held (micro)
  readonly costBasis: Kobo; // integer kobo actually paid for current qty
}

export interface BuyResult {
  readonly position: Position;
  readonly cashDelta: Kobo; // negative — what leaves cash
}

export interface SellResult {
  readonly position: Position;
  readonly cashDelta: Kobo; // positive — proceeds added to cash
  readonly realizedPnl: Kobo;
}

/** Apply a buy. cashDelta === −tradeCost exactly (reconciles by construction). */
export function applyBuy(pos: Position, price: Kobo, qty: QtyMicro): BuyResult {
  if (qty <= 0) throw new RangeError("applyBuy: qty must be positive");
  const cost = tradeCost(price, qty);
  return {
    position: {
      qty: qtyMicro(pos.qty + qty),
      costBasis: kobo(pos.costBasis + cost),
    },
    cashDelta: kobo(-cost),
  };
}

/**
 * Apply a sell of `qty` units. Cost basis is removed proportionally:
 *   removed = round(costBasis × qty / totalQty)
 * Realized P/L = proceeds − removed. Remaining basis = costBasis − removed.
 */
export function applySell(pos: Position, price: Kobo, qty: QtyMicro): SellResult {
  if (qty <= 0) throw new RangeError("applySell: qty must be positive");
  if (qty > pos.qty) throw new RangeError("applySell: cannot sell more than held");
  const proceeds = tradeCost(price, qty);
  const remainingQty = qtyMicro(pos.qty - qty);
  // Apportion basis; if fully closing, remove all remaining basis to leave 0.
  const removed =
    remainingQty === 0 ? pos.costBasis : kobo(divRound(pos.costBasis * qty, pos.qty));
  return {
    position: {
      qty: remainingQty,
      costBasis: kobo(pos.costBasis - removed),
    },
    cashDelta: kobo(proceeds),
    realizedPnl: kobo(proceeds - removed),
  };
}

/** Largest qty (micro) affordable at `price` given `cash`, floored to whole micro. */
export function maxAffordableQty(cash: Kobo, price: Kobo): QtyMicro {
  if (price <= 0) return qtyMicro(0);
  // cash >= price * qty / SCALE  ⇒  qty <= cash * SCALE / price  (floor)
  return qtyMicro(Math.floor((cash * QTY_SCALE) / price));
}

// ── Formatting — ONLY at the UI edge. Never feed these back into math. ───────
const nairaFmt = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatNaira(value: Kobo): string {
  return nairaFmt.format(value / KOBO_PER_NAIRA);
}

/** Like formatNaira but with an explicit sign for deltas (+/−). */
export function formatSignedNaira(value: Kobo): string {
  const s = formatNaira(kobo(Math.abs(value)));
  if (value > 0) return `+${s}`;
  if (value < 0) return `−${s}`;
  return s;
}

export function formatQty(qty: QtyMicro): string {
  const units = qty / QTY_SCALE;
  // Show up to 6 dp but trim trailing zeros for readability.
  return units.toLocaleString("en-NG", { maximumFractionDigits: 6 });
}

export function formatPercent(ratio: number): string {
  const sign = ratio > 0 ? "+" : ratio < 0 ? "−" : "";
  return `${sign}${(Math.abs(ratio) * 100).toFixed(2)}%`;
}
