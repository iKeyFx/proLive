"use client";

import { memo } from "react";

/**
 * A single digit rendered as a vertical 0–9 strip translated to show `value`.
 * When `value` changes the CSS transition rolls it like a mechanical counter.
 * Under prefers-reduced-motion the transition is disabled (see globals.css), so
 * it snaps instantly — same component, accessible by default.
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

/**
 * Renders a numeric string where digits roll and separators (.,₦ space −) stay
 * static. The real value is exposed to assistive tech via the parent's aria.
 */
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
