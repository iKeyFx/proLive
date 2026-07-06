import "server-only";
import { priceAt } from "@/lib/feed/price-model";
import { isKnownSymbol } from "@/lib/instruments";

/**
 * The authoritative price used to execute a trade. The server computes it from
 * the deterministic model at the moment of execution — it never trusts the
 * price the browser sent. Because the model is a pure function of time, this
 * value is exactly what the client is displaying (± a tick), yet it is derived
 * independently on the server, so a spoofed client price is simply ignored.
 */
export function authoritativePrice(symbol: string): number | null {
  if (!isKnownSymbol(symbol)) return null;
  const price = priceAt(symbol, Date.now());
  return price > 0 ? price : null;
}
