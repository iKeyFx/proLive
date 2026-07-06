import { KOBO_PER_NAIRA } from "@/lib/money";

/** "₦2,981.00" — display formatting for the tape. Never fed back into math. */
export function tapeText(priceKobo: number): string {
  const naira = priceKobo / KOBO_PER_NAIRA;
  return `₦${naira.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
