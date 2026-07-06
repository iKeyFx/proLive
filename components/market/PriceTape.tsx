"use client";

import { memo } from "react";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCell } from "@/lib/store/selectors";
import { DigitRoll } from "@/components/market/DigitRoll";
import { tapeText } from "@/lib/format";

type Size = "sm" | "md" | "lg" | "xl";

const sizeClass: Record<Size, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
  xl: "text-4xl",
};

/**
 * The signature element. Subscribes to ONE symbol's price cell — thanks to
 * Immer's structural sharing this component re-renders only when its own symbol
 * ticks. On each tick a thin direction-coloured underline sweeps and a low-alpha
 * wash flashes, both keyed on the cell revision so they replay every tick and
 * settle in ~300ms. Digits roll via <DigitRoll>. The whole thing collapses to an
 * instant swap under prefers-reduced-motion (handled in globals.css).
 */
export const PriceTape = memo(function PriceTape({
  symbol,
  size = "md",
  className = "",
}: {
  symbol: string;
  size?: Size;
  className?: string;
}) {
  const cell = useAppSelector(selectCell(symbol));

  if (!cell) {
    return (
      <span className={`tnum text-text-lo ${sizeClass[size]} ${className}`} aria-label="price loading">
        ₦——.——
      </span>
    );
  }

  const text = tapeText(cell.price);
  const dir = cell.price > cell.prev ? "up" : cell.price < cell.prev ? "down" : "flat";

  return (
    <span
      className={`relative inline-flex items-baseline ${sizeClass[size]} ${className}`}
      role="text"
      aria-label={`${symbol} ${text}`}
    >
      <DigitRoll text={text} />
      {dir !== "flat" && (
        <>
          {/* wash overlay — animates from a faint tint to transparent */}
          <span
            key={`f${cell.rev}`}
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-[-2px] inset-y-0 rounded-sm ${
              dir === "up" ? "tape-flash-up" : "tape-flash-down"
            }`}
          />
          {/* sweeping direction underline */}
          <span
            key={`u${cell.rev}`}
            aria-hidden="true"
            className={`tape-underline ${dir === "up" ? "tape-underline-up" : "tape-underline-down"}`}
          />
        </>
      )}
    </span>
  );
});
