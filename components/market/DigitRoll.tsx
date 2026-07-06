"use client";

import { memo } from "react";

/**
 * A digit as a vertical 0–9 strip translated to `value`; a CSS transition
 * rolls it like a mechanical counter (snaps instantly under reduced-motion).
 */
const Digit = memo(function Digit({ value }: { value: number }) {
  return (
    <span className="digit-cell" aria-hidden="true">
      <span className="digit-track" style={{ transform: `translateY(${-value}em)` }}>
        {Array.from({ length: 10 }, (_, n) => (
          <span key={n}>{n}</span>
        ))}
      </span>
    </span>
  );
});

/** Numeric string where digits roll and separators stay static. */
export const DigitRoll = memo(function DigitRoll({ text }: { text: string }) {
  return (
    <span className="tnum inline-flex items-baseline">
      {text.split("").map((ch, i) => {
        if (ch >= "0" && ch <= "9") {
          return <Digit key={i} value={Number(ch)} />;
        }
        return (
          <span key={i} aria-hidden="true">
            {ch}
          </span>
        );
      })}
    </span>
  );
});
