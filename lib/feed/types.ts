/**
 * Wire format for the in-house price feed (simulator → WebSocket → client).
 * Prices are integer kobo. These messages are display data only and are NEVER
 * the persisted source of truth — the server revalidates price at execution.
 */

export interface PricePoint {
  /** Current price in kobo (integer). */
  readonly price: number;
  /** Reference price 24h ago (the session "open") in kobo — for 24h change. */
  readonly open: number;
  /** Epoch millis of this price. */
  readonly ts: number;
}

/** Sent once on connect: the full current book. */
export interface SnapshotMessage {
  readonly type: "snapshot";
  readonly prices: Record<string, PricePoint>;
  /** Recent closes per symbol for sparklines (oldest → newest), in kobo. */
  readonly spark: Record<string, number[]>;
}

/** Sent on every coalesced update: only the symbols that moved this frame. */
export interface TickMessage {
  readonly type: "tick";
  readonly ts: number;
  readonly updates: Array<{
    readonly symbol: string;
    readonly price: number;
    readonly prev: number;
  }>;
}

export type FeedMessage = SnapshotMessage | TickMessage;

export type Direction = "up" | "down" | "flat";

export function direction(price: number, prev: number): Direction {
  if (price > prev) return "up";
  if (price < prev) return "down";
  return "flat";
}
