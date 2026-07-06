/**
 * Deterministic price model — the backbone of the serverless design.
 *
 * A price is a PURE FUNCTION of (symbol, time): a per-symbol blend of sine waves
 * (slow trend + medium swing + fast flicker) around the instrument's seed price.
 * It looks like a live random walk but needs no server, no socket, and no shared
 * state — the browser evaluates it on a timer to animate, and the server
 * evaluates the SAME function at `Date.now()` to get an authoritative price it
 * can trust. That independent agreement is exactly what lets the server reject a
 * spoofed client price with zero infrastructure.
 *
 * All prices are integer kobo. Display data only — never persisted truth.
 */
import { INSTRUMENTS, getInstrument } from "@/lib/instruments";
import type { SnapshotMessage, PricePoint } from "@/lib/feed/types";

const TWO_PI = Math.PI * 2;
const DAY_MS = 86_400_000;
const FLOOR_KOBO = 100;

/** Deterministic hash of a string → [0, 1). */
function hash01(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/** Current price for `symbol` at epoch-ms `tMs`, in integer kobo. */
export function priceAt(symbol: string, tMs: number): number {
  const inst = getInstrument(symbol);
  if (!inst) return 0;

  const t = tMs / 1000; // seconds
  const p1 = hash01(`${symbol}:a`) * TWO_PI;
  const p2 = hash01(`${symbol}:b`) * TWO_PI;
  const p3 = hash01(`${symbol}:c`) * TWO_PI;

  // Slow trend + medium swing (shape the session) …
  const slow =
    0.55 * Math.sin(t / 540 + p1) +
    0.3 * Math.sin(t / 173 + p2) +
    0.15 * Math.sin(t / 61 + p3);
  // … plus fast flicker so the last digits move on every tick.
  const fast = 0.1 * Math.sin(t / 7.3 + p2) + 0.06 * Math.sin(t / 2.9 + p1);

  const amp = inst.vol * 2.2; // ≈ ±3–6% band around the seed
  const price = inst.seedPrice * (1 + amp * (slow + fast));
  return Math.max(FLOOR_KOBO, Math.round(price));
}

/** The 24h reference ("open") = the same function evaluated a day earlier. */
export function openPrice(symbol: string, nowMs: number): number {
  return priceAt(symbol, nowMs - DAY_MS);
}

/** Recent price series (oldest → newest) for sparklines. */
export function sparkSeries(
  symbol: string,
  nowMs: number,
  count = 48,
  stepMs = 1500,
): number[] {
  const out: number[] = [];
  for (let i = count - 1; i >= 0; i--) out.push(priceAt(symbol, nowMs - i * stepMs));
  return out;
}

/** Full snapshot for hydrating the store on load. */
export function buildSnapshot(nowMs: number): SnapshotMessage {
  const prices: Record<string, PricePoint> = {};
  const spark: Record<string, number[]> = {};
  for (const inst of INSTRUMENTS) {
    prices[inst.symbol] = {
      price: priceAt(inst.symbol, nowMs),
      open: openPrice(inst.symbol, nowMs),
      ts: nowMs,
    };
    spark[inst.symbol] = sparkSeries(inst.symbol, nowMs);
  }
  return { type: "snapshot", prices, spark };
}

/** Current tick batch for all symbols (used by the client ticker). */
export function tickAll(nowMs: number): Array<{ symbol: string; price: number; prev: number }> {
  return INSTRUMENTS.map((inst) => {
    const price = priceAt(inst.symbol, nowMs);
    return { symbol: inst.symbol, price, prev: price };
  });
}
