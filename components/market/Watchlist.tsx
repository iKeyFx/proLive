"use client";

import { useCallback, useEffect, useState } from "react";
import { INSTRUMENTS } from "@/lib/instruments";
import { useAppStore } from "@/lib/store/hooks";
import { MarketRow } from "@/components/market/MarketRow";
import { ArrowUp, ArrowDown } from "@/components/icons";

type SortKey = "symbol" | "price" | "change";
type SortDir = "asc" | "desc";
const STORAGE_KEY = "prolive.watchlist.sort";

interface SortState {
  key: SortKey;
  dir: SortDir;
}

/**
 * Sorting recomputes on a gentle cadence (and immediately on user change) rather
 * than every tick — rows still update their prices live in place, but the table
 * doesn't reorder on every frame, which would be jarring. Sort choice persists
 * to localStorage.
 */
const RESORT_MS = 1500;

function orderSymbols(
  state: ReturnType<ReturnType<typeof useAppStore>["getState"]>,
  sort: SortState,
): string[] {
  const prices = state.prices.bySymbol;
  const arr = INSTRUMENTS.map((i) => i.symbol);
  const mul = sort.dir === "asc" ? 1 : -1;
  arr.sort((a, b) => {
    if (sort.key === "symbol") return a.localeCompare(b) * mul;
    const ca = prices[a];
    const cb = prices[b];
    if (sort.key === "price") return ((ca?.price ?? 0) - (cb?.price ?? 0)) * mul;
    const chA = ca && ca.open ? (ca.price - ca.open) / ca.open : 0;
    const chB = cb && cb.open ? (cb.price - cb.open) / cb.open : 0;
    return (chA - chB) * mul;
  });
  return arr;
}

export function Watchlist() {
  const store = useAppStore();
  const [sort, setSort] = useState<SortState>({ key: "symbol", dir: "asc" });
  const [order, setOrder] = useState<string[]>(() => INSTRUMENTS.map((i) => i.symbol));

  // Restore persisted sort.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSort(JSON.parse(raw) as SortState);
    } catch {
      /* ignore malformed */
    }
  }, []);

  const recompute = useCallback(() => {
    setOrder(orderSymbols(store.getState(), sort));
  }, [store, sort]);

  // Re-sort on sort change + on a calm interval.
  useEffect(() => {
    recompute();
    const id = setInterval(recompute, RESORT_MS);
    return () => clearInterval(id);
  }, [recompute]);

  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      const next: SortState =
        prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const bySymbol = new Map(INSTRUMENTS.map((i) => [i.symbol, i]));

  return (
    <section aria-labelledby="watchlist-h" className="rounded-lg border border-line bg-ink-800">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 id="watchlist-h" className="font-display text-sm font-medium">
          Watchlist
        </h2>
        <span className="text-xs text-text-lo">{INSTRUMENTS.length} instruments</span>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-text-lo">
            <SortHeader label="Instrument" col="symbol" sort={sort} onSort={toggleSort} className="pl-4" />
            <th className="hidden px-2 py-2 font-normal lg:table-cell">Sector</th>
            <SortHeader label="Last" col="price" sort={sort} onSort={toggleSort} align="right" />
            <SortHeader label="24h" col="change" sort={sort} onSort={toggleSort} align="right" />
            <th className="hidden py-2 pr-4 text-right font-normal sm:table-cell">Trend</th>
          </tr>
        </thead>
        <tbody>
          {order.map((symbol) => {
            const inst = bySymbol.get(symbol)!;
            return <MarketRow key={symbol} symbol={symbol} name={inst.name} sector={inst.sector} />;
          })}
        </tbody>
      </table>
    </section>
  );
}

function SortHeader({
  label,
  col,
  sort,
  onSort,
  align = "left",
  className = "",
}: {
  label: string;
  col: SortKey;
  sort: SortState;
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sort.key === col;
  return (
    <th className={`px-2 py-2 font-normal ${align === "right" ? "text-right" : "text-left"} ${className}`}>
      <button
        type="button"
        onClick={() => onSort(col)}
        aria-label={`Sort by ${label}`}
        className={`inline-flex items-center gap-1 hover:text-text-hi ${active ? "text-text-hi" : ""} ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        {label}
        {active && (sort.dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button>
    </th>
  );
}
