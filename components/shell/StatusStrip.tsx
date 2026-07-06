"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/lib/store/hooks";
import { selectPortfolioTotals, selectStatus } from "@/lib/store/selectors";
import { formatNaira, formatPercent, formatSignedNaira, kobo, pnlPercent } from "@/lib/money";
import type { ConnectionStatus } from "@/lib/store/pricesSlice";
import { ArrowDown, ArrowUp } from "@/components/icons";

const STATUS_META: Record<ConnectionStatus, { label: string; color: string; pulse: boolean }> = {
  live: { label: "Live", color: "var(--up)", pulse: true },
  connecting: { label: "Connecting", color: "var(--signal)", pulse: true },
  reconnecting: { label: "Reconnecting", color: "var(--signal)", pulse: true },
  stale: { label: "Stale", color: "var(--down)", pulse: false },
};

function ConnectionDot() {
  const status = useAppSelector(selectStatus);
  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
      <span className="relative flex h-2 w-2">
        {meta.pulse && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ backgroundColor: meta.color }}
          />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
      </span>
      <span className="hidden text-xs text-text-lo sm:inline">{meta.label}</span>
    </span>
  );
}

function Clock() {
  const [time, setTime] = useState<string>("--:--:--");
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString("en-GB", { hour12: false, timeZone: "UTC" });
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="tnum text-xs text-text-lo" aria-hidden="true">
      {time} UTC
    </span>
  );
}

function TotalValue() {
  const totals = useAppSelector(selectPortfolioTotals);
  const pnl = kobo(totals.unrealizedKobo);
  const pct = pnlPercent(pnl, kobo(totals.costBasisKobo));
  const up = totals.unrealizedKobo > 0;
  const down = totals.unrealizedKobo < 0;
  const color = up ? "text-up" : down ? "text-down" : "text-text-lo";

  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-4">
      <div className="flex min-w-0 flex-col items-end leading-tight">
        <span className="text-[10px] uppercase tracking-wider text-text-lo">Total value</span>
        <span className="tnum truncate text-sm font-medium text-text-hi">
          {formatNaira(kobo(totals.totalKobo))}
        </span>
      </div>
      <div className={`flex shrink-0 items-center gap-1 ${color}`}>
        {up ? <ArrowUp size={13} /> : down ? <ArrowDown size={13} /> : null}
        <span className="tnum hidden text-sm sm:inline">{formatSignedNaira(pnl)}</span>
        <span className="tnum text-xs opacity-80">({formatPercent(pct)})</span>
      </div>
    </div>
  );
}

export function StatusStrip() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 overflow-hidden border-b border-line bg-ink-900/95 px-4 backdrop-blur md:px-6">
      <div className="flex shrink-0 items-center gap-3">
        <ConnectionDot />
        <span className="hidden h-4 w-px bg-line sm:block" />
        <span className="hidden sm:inline-block">
          <Clock />
        </span>
      </div>
      <TotalValue />
    </header>
  );
}
