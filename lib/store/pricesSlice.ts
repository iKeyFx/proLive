import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SnapshotMessage } from "@/lib/feed/types";

export type ConnectionStatus = "connecting" | "live" | "reconnecting" | "stale";

export interface PriceCell {
  /** Current price, kobo (int). */
  price: number;
  /** Previous price, kobo — drives the direction flash. */
  prev: number;
  /** Session open (24h ref), kobo. */
  open: number;
  /** Epoch millis of last update. */
  ts: number;
  /**
   * Monotonic revision; bumped on every applied change. Cells subscribe to this
   * so a component re-renders only when *its* symbol actually moved.
   */
  rev: number;
}

interface PricesState {
  bySymbol: Record<string, PriceCell>;
  spark: Record<string, number[]>;
  status: ConnectionStatus;
  /** ts of the last message of any kind — used to flag staleness. */
  lastMessageTs: number;
}

const initialState: PricesState = {
  bySymbol: {},
  spark: {},
  status: "connecting",
  lastMessageTs: 0,
};

const SPARK_CAP = 48;

export const pricesSlice = createSlice({
  name: "prices",
  initialState,
  reducers: {
    snapshot(state, action: PayloadAction<SnapshotMessage>) {
      const { prices, spark } = action.payload;
      for (const [symbol, p] of Object.entries(prices)) {
        const existing = state.bySymbol[symbol];
        state.bySymbol[symbol] = {
          price: p.price,
          prev: p.price,
          open: p.open,
          ts: p.ts,
          rev: (existing?.rev ?? 0) + 1,
        };
      }
      for (const [symbol, points] of Object.entries(spark)) {
        state.spark[symbol] = points.slice(-SPARK_CAP);
      }
      state.status = "live";
      state.lastMessageTs = Date.now();
    },

    /** Apply a coalesced batch of ticks (one dispatch per animation frame). */
    applyTicks(
      state,
      action: PayloadAction<Array<{ symbol: string; price: number; prev: number }>>,
    ) {
      const now = Date.now();
      for (const u of action.payload) {
        const cell = state.bySymbol[u.symbol];
        if (cell) {
          cell.prev = cell.price;
          cell.price = u.price;
          cell.ts = now;
          cell.rev += 1;
        } else {
          state.bySymbol[u.symbol] = {
            price: u.price,
            prev: u.prev,
            open: u.prev,
            ts: now,
            rev: 1,
          };
        }
        const s = state.spark[u.symbol] ?? [];
        s.push(u.price);
        if (s.length > SPARK_CAP) s.shift();
        state.spark[u.symbol] = s;
      }
      if (state.status !== "live") state.status = "live";
      state.lastMessageTs = now;
    },

    setStatus(state, action: PayloadAction<ConnectionStatus>) {
      state.status = action.payload;
    },
  },
});

export const { snapshot, applyTicks, setStatus } = pricesSlice.actions;
export default pricesSlice.reducer;
