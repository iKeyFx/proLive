"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { PriceTape } from "@/components/market/PriceTape";
import { ChangePill } from "@/components/market/ChangePill";
import { Sparkline } from "@/components/market/Sparkline";

/**
 * One watchlist row; sub-components subscribe to their own price slice so a
 * tick updates this row only. Keyboard-operable (Enter/Space opens detail).
 */
export const MarketRow = memo(function MarketRow({
  symbol,
  name,
  sector,
}: {
  symbol: string;
  name: string;
  sector: string;
}) {
  const router = useRouter();
  const open = () => router.push(`/instrument/${symbol}`);

  return (
    <tr
      tabIndex={0}
      role="link"
      aria-label={`Open ${name} detail`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className="cursor-pointer border-b border-line/60 outline-offset-[-2px] transition-colors hover:bg-ink-700/60 focus-visible:bg-ink-700/60"
    >
      <td className="py-3 pl-4 pr-2">
        <div className="flex flex-col">
          <span className="font-display text-sm font-medium text-text-hi">{symbol}</span>
          <span className="hidden text-xs text-text-lo sm:block">{name}</span>
        </div>
      </td>
      <td className="hidden px-2 py-3 text-xs text-text-lo lg:table-cell">{sector}</td>
      <td className="px-2 py-3 text-right">
        <PriceTape symbol={symbol} size="md" className="justify-end text-text-hi" />
      </td>
      <td className="px-2 py-3 text-right">
        <div className="flex justify-end">
          <ChangePill symbol={symbol} />
        </div>
      </td>
      <td className="hidden py-3 pl-2 pr-4 sm:table-cell">
        <div className="flex justify-end">
          <Sparkline symbol={symbol} />
        </div>
      </td>
    </tr>
  );
});
