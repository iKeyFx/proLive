"use client";

import { memo } from "react";
import Link from "next/link";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCell, selectHolding } from "@/lib/store/selectors";
import {
  avgEntry,
  formatNaira,
  formatPercent,
  formatQty,
  formatSignedNaira,
  kobo,
  marketValue,
  pnlPercent,
  qtyMicro,
  unrealizedPnl,
} from "@/lib/money";
import { ArrowUp, ArrowDown } from "@/components/icons";

/** One portfolio row. Subscribes to its own holding + price cell only. */
export const HoldingRow = memo(function HoldingRow({ symbol, name }: { symbol: string; name: string }) {
  const holding = useAppSelector(selectHolding(symbol));
  const cell = useAppSelector(selectCell(symbol));
  if (!holding) return null;

  const price = cell?.price ?? 0;
  const qty = qtyMicro(holding.qtyMicro);
  const basis = kobo(holding.costBasisKobo);
  const avg = avgEntry(basis, qty);
  const mv = marketValue(kobo(price), qty);
  const pnl = unrealizedPnl(kobo(price), qty, basis);
  const pct = pnlPercent(pnl, basis);
  const up = pnl > 0;
  const down = pnl < 0;
  const color = up ? "text-up" : down ? "text-down" : "text-text-lo";

  return (
    <tr className="border-b border-line/60 transition-colors hover:bg-ink-700/40">
      <td className="py-3 pl-4 pr-2">
        <Link href={`/instrument/${symbol}`} className="flex flex-col hover:text-signal">
          <span className="font-display text-sm font-medium text-text-hi">{symbol}</span>
          <span className="hidden text-xs text-text-lo sm:block">{name}</span>
        </Link>
      </td>
      <td className="tnum px-2 py-3 text-right text-text-hi">{formatQty(qty)}</td>
      <td className="tnum hidden px-2 py-3 text-right text-text-lo sm:table-cell">{formatNaira(avg)}</td>
      <td className="tnum px-2 py-3 text-right text-text-hi">{formatNaira(kobo(price))}</td>
      <td className="tnum hidden px-2 py-3 text-right text-text-hi md:table-cell">{formatNaira(mv)}</td>
      <td className={`px-2 py-3 pr-4 text-right ${color}`}>
        <div className="flex flex-col items-end">
          <span className="tnum flex items-center gap-1 text-sm">
            {up ? <ArrowUp size={12} /> : down ? <ArrowDown size={12} /> : null}
            {formatSignedNaira(pnl)}
          </span>
          <span className="tnum text-xs opacity-80">{formatPercent(pct)}</span>
        </div>
      </td>
    </tr>
  );
});
