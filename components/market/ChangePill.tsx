"use client";

import { memo } from "react";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCell } from "@/lib/store/selectors";
import { formatPercent } from "@/lib/money";
import { ArrowUp, ArrowDown, DashIcon } from "@/components/icons";

/**
 * 24h change vs the session open. Direction is encoded by BOTH colour and an
 * arrow glyph + sign, so it remains distinguishable without colour (a11y).
 */
export const ChangePill = memo(function ChangePill({
  symbol,
  showValue = true,
  size = 13,
}: {
  symbol: string;
  showValue?: boolean;
  size?: number;
}) {
  const cell = useAppSelector(selectCell(symbol));
  if (!cell || cell.open === 0) {
    return <span className="tnum text-xs text-text-lo">—</span>;
  }

  const ratio = (cell.price - cell.open) / cell.open;
  const up = ratio > 0;
  const down = ratio < 0;
  const color = up ? "text-up" : down ? "text-down" : "text-text-lo";

  return (
    <span className={`inline-flex items-center gap-1 tnum text-xs ${color}`}>
      {up ? <ArrowUp size={size} /> : down ? <ArrowDown size={size} /> : <DashIcon size={size} />}
      {showValue && <span>{formatPercent(ratio)}</span>}
    </span>
  );
});
