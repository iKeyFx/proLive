/**
 * The canonical instrument registry. This is the ONLY allow-list of tradable
 * symbols. The simulator seeds prices from here; the trade server action
 * validates incoming symbols against `SYMBOLS` and rejects anything else.
 *
 * Seed prices are integer kobo (₦ × 100). These are fictional instruments on a
 * fictional exchange — no real market data, no third-party feed.
 */
import type { Kobo } from "@/lib/money";

export interface Instrument {
  readonly symbol: string;
  readonly name: string;
  readonly sector: string;
  /** Seed last price in kobo. */
  readonly seedPrice: Kobo;
  /** Annualised volatility-ish knob for the random walk (0..1). */
  readonly vol: number;
}

export const INSTRUMENTS: readonly Instrument[] = [
  { symbol: "DANG", name: "Dangote Cement", sector: "Industrials", seedPrice: 29810 as Kobo, vol: 0.018 },
  { symbol: "GTCO", name: "Guaranty Trust", sector: "Financials", seedPrice: 4155 as Kobo, vol: 0.022 },
  { symbol: "MTNN", name: "MTN Nigeria", sector: "Telecoms", seedPrice: 19880 as Kobo, vol: 0.02 },
  { symbol: "ZENB", name: "Zenith Bank", sector: "Financials", seedPrice: 3640 as Kobo, vol: 0.024 },
  { symbol: "NEST", name: "Nestlé Nigeria", sector: "Consumer", seedPrice: 92500 as Kobo, vol: 0.012 },
  { symbol: "AIRT", name: "Airtel Africa", sector: "Telecoms", seedPrice: 21300 as Kobo, vol: 0.019 },
  { symbol: "SEPL", name: "Seplat Energy", sector: "Energy", seedPrice: 38450 as Kobo, vol: 0.028 },
  { symbol: "BUAF", name: "BUA Foods", sector: "Consumer", seedPrice: 41200 as Kobo, vol: 0.021 },
] as const;

export const SYMBOLS: readonly string[] = INSTRUMENTS.map((i) => i.symbol);

const BY_SYMBOL = new Map(INSTRUMENTS.map((i) => [i.symbol, i]));

export function isKnownSymbol(symbol: string): boolean {
  return BY_SYMBOL.has(symbol);
}

export function getInstrument(symbol: string): Instrument | undefined {
  return BY_SYMBOL.get(symbol);
}
