/**
 * Price-feed wire/store types. Prices are integer kobo and are display data
 * only — never the persisted source of truth.
 */

export interface PricePoint {
  readonly price: number;
  /** 24h reference price (the session "open"), kobo. */
  readonly open: number;
  readonly ts: number;
}

export interface SnapshotMessage {
  readonly type: "snapshot";
  readonly prices: Record<string, PricePoint>;
  /** Recent closes per symbol for sparklines (oldest → newest). */
  readonly spark: Record<string, number[]>;
}

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
