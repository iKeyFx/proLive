"use client";

import { memo } from "react";
import { useAppSelector } from "@/lib/store/hooks";
import { selectSpark } from "@/lib/store/selectors";

/**
 * A tiny SVG sparkline of recent prices. Colour reflects net move over the
 * window (up/down/flat). Purely decorative-support, so it's aria-hidden — the
 * numeric change is conveyed by <ChangePill>.
 */
export const Sparkline = memo(function Sparkline({
  symbol,
  width = 92,
  height = 28,
}: {
  symbol: string;
  width?: number;
  height?: number;
}) {
  const points = useAppSelector(selectSpark(symbol));

  if (!points || points.length < 2) {
    return <div style={{ width, height }} className="skeleton" aria-hidden="true" />;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = width / (points.length - 1);

  const d = points
    .map((p, i) => {
      const x = i * stepX;
      const y = height - ((p - min) / span) * (height - 2) - 1;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const net = points[points.length - 1]! - points[0]!;
  const stroke = net > 0 ? "var(--up)" : net < 0 ? "var(--down)" : "var(--text-lo)";

  return (
    <svg width={width} height={height} aria-hidden="true" className="overflow-visible">
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.25} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
});
