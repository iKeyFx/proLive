"use client";

import { INSTRUMENTS } from "@/lib/instruments";
import { PriceTape } from "@/components/market/PriceTape";
import { ChangePill } from "@/components/market/ChangePill";

const FEATURED = INSTRUMENTS.slice(0, 6);

/**
 * The top "tape" strip — a few featured instruments rendered with the signature
 * price animation. Horizontally scrollable on narrow screens.
 */
export function FeaturedTape() {
  return (
    <div className="flex items-center gap-6 overflow-x-auto border-b border-line bg-ink-800/40 px-4 py-2 md:px-6">
      <span className="hidden shrink-0 text-[10px] uppercase tracking-widest text-text-lo sm:block">
        Tape
      </span>
      {FEATURED.map((inst) => (
        <div key={inst.symbol} className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <span className="font-display text-xs font-medium text-text-lo">{inst.symbol}</span>
          <PriceTape symbol={inst.symbol} size="sm" className="text-text-hi" />
          <ChangePill symbol={inst.symbol} showValue={false} />
        </div>
      ))}
    </div>
  );
}
