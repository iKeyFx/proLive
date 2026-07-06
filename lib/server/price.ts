import "server-only";
import { feedHttpBase } from "@/lib/env";

/**
 * Server-side authoritative price read. The trade action calls this and uses the
 * returned price to compute cost — the browser's claimed price is never trusted.
 * Short timeout + no caching so we always execute against a fresh price.
 */
export async function fetchAuthoritativePrice(symbol: string): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch(`${feedHttpBase()}/prices`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { prices?: Record<string, number> };
    const price = body.prices?.[symbol];
    return typeof price === "number" && Number.isFinite(price) && price > 0 ? price : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
