/** UI-edge formatting helpers for the tape (kobo → display string). */
import { KOBO_PER_NAIRA } from "@/lib/money";

/** "₦2,981.00" — symbol + grouped naira with fixed 2dp. Display only. */
export function tapeText(priceKobo: number): string {
  const naira = priceKobo / KOBO_PER_NAIRA;
  return `₦${naira.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Plain grouped number without symbol, e.g. "2,981.00". */
export function plainText(priceKobo: number): string {
  return (priceKobo / KOBO_PER_NAIRA).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
