import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/store";
import { marketValue, unrealizedPnl, kobo, qtyMicro } from "@/lib/money";

// ── Prices ───────────────────────────────────────────────────────────────────
export const selectStatus = (s: RootState) => s.prices.status;

/**
 * Selecting a single cell: Immer structurally shares unchanged cells, so this
 * reference changes ONLY when `symbol` ticked — a component subscribed to it
 * re-renders for its own symbol and nothing else.
 */
export const selectCell = (symbol: string) => (s: RootState) => s.prices.bySymbol[symbol];

export const selectSpark = (symbol: string) => (s: RootState) => s.prices.spark[symbol];

// ── Account ──────────────────────────────────────────────────────────────────
export const selectCash = (s: RootState) => s.account.cashKobo;
export const selectLoaded = (s: RootState) => s.account.loaded;
export const selectHolding = (symbol: string) => (s: RootState) => s.account.holdings[symbol];
export const selectOrders = (s: RootState) => s.account.orders;

const selectHoldingsMap = (s: RootState) => s.account.holdings;
const selectPrices = (s: RootState) => s.prices.bySymbol;

export const selectHoldingSymbols = createSelector([selectHoldingsMap], (h) =>
  Object.keys(h).sort(),
);

/** Total invested market value (Σ qty × live price) + total cost basis. */
export const selectPortfolioTotals = createSelector(
  [selectHoldingsMap, selectPrices, selectCash],
  (holdings, prices, cash) => {
    let marketValueKobo = 0;
    let costBasisKobo = 0;
    for (const h of Object.values(holdings)) {
      const cell = prices[h.symbol];
      const price = cell?.price ?? 0;
      marketValueKobo += marketValue(kobo(price), qtyMicro(h.qtyMicro));
      costBasisKobo += h.costBasisKobo;
    }
    const unrealized = marketValueKobo - costBasisKobo;
    return {
      cashKobo: cash,
      investedKobo: marketValueKobo,
      costBasisKobo,
      unrealizedKobo: unrealized,
      totalKobo: cash + marketValueKobo,
    };
  },
);

/** Per-holding live derivation used by portfolio rows. */
export function deriveHolding(
  qtyMicroVal: number,
  costBasisKobo: number,
  priceKobo: number,
) {
  const mv = marketValue(kobo(priceKobo), qtyMicro(qtyMicroVal));
  const pnl = unrealizedPnl(kobo(priceKobo), qtyMicro(qtyMicroVal), kobo(costBasisKobo));
  return { marketValueKobo: mv, pnlKobo: pnl };
}
