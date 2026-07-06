import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Persisted truth, mirrored client-side. Money is kobo; qty is micro-units. */
export interface HoldingEntry {
  symbol: string;
  qtyMicro: number;
  costBasisKobo: number;
}

export interface OrderEntry {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  qtyMicro: number;
  priceKobo: number;
  totalKobo: number;
  createdAt: string;
}

interface AccountState {
  cashKobo: number;
  holdings: Record<string, HoldingEntry>; // keyed by symbol
  orders: OrderEntry[]; // reverse-chronological
  loaded: boolean;
  /** Snapshot of state before an optimistic trade, for rollback on failure. */
  rollback: { cashKobo: number; holding: HoldingEntry | null; symbol: string } | null;
}

const initialState: AccountState = {
  cashKobo: 0,
  holdings: {},
  orders: [],
  loaded: false,
  rollback: null,
};

export const accountSlice = createSlice({
  name: "account",
  initialState,
  reducers: {
    hydrate(
      state,
      action: PayloadAction<{
        cashKobo: number;
        holdings: HoldingEntry[];
        orders: OrderEntry[];
      }>,
    ) {
      state.cashKobo = action.payload.cashKobo;
      state.holdings = {};
      for (const h of action.payload.holdings) state.holdings[h.symbol] = h;
      state.orders = action.payload.orders;
      state.loaded = true;
    },

    /** Cross-tab realtime sync: replace cash + a single holding's truth. */
    syncCash(state, action: PayloadAction<number>) {
      state.cashKobo = action.payload;
    },
    syncHolding(state, action: PayloadAction<HoldingEntry>) {
      const h = action.payload;
      if (h.qtyMicro <= 0) delete state.holdings[h.symbol];
      else state.holdings[h.symbol] = h;
    },
    removeHolding(state, action: PayloadAction<string>) {
      delete state.holdings[action.payload];
    },
    prependOrder(state, action: PayloadAction<OrderEntry>) {
      if (!state.orders.some((o) => o.id === action.payload.id)) {
        state.orders.unshift(action.payload);
      }
    },

    /**
     * Optimistic apply: stash a rollback snapshot, then mutate cash + holding so
     * the UI reflects the trade instantly. Confirmed or reverted by the action.
     */
    optimisticApply(
      state,
      action: PayloadAction<{
        symbol: string;
        cashKobo: number;
        holding: HoldingEntry | null; // null === position fully closed
      }>,
    ) {
      const { symbol, cashKobo, holding } = action.payload;
      state.rollback = {
        cashKobo: state.cashKobo,
        holding: state.holdings[symbol] ?? null,
        symbol,
      };
      state.cashKobo = cashKobo;
      if (holding === null) delete state.holdings[symbol];
      else state.holdings[symbol] = holding;
    },
    commitOptimistic(state) {
      state.rollback = null;
    },
    revertOptimistic(state) {
      if (!state.rollback) return;
      const { cashKobo, holding, symbol } = state.rollback;
      state.cashKobo = cashKobo;
      if (holding === null) delete state.holdings[symbol];
      else state.holdings[symbol] = holding;
      state.rollback = null;
    },
  },
});

export const {
  hydrate,
  syncCash,
  syncHolding,
  removeHolding,
  prependOrder,
  optimisticApply,
  commitOptimistic,
  revertOptimistic,
} = accountSlice.actions;
export default accountSlice.reducer;
