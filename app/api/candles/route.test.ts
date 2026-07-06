import { describe, it, expect } from "vitest";
import { GET } from "./route";
import { priceAt } from "@/lib/feed/price-model";
import { KOBO_PER_NAIRA } from "@/lib/money";

const round2 = (n: number) => Math.round(n * 100) / 100;

describe("candles route — never samples the future", () => {
  it.each(["1m", "5m", "1h", "1d"] as const)(
    "%s: final candle ends at now and its close matches the model",
    async (tf) => {
      const before = Math.floor(Date.now() / 1000);
      const res = await GET(new Request(`http://test/api/candles?symbol=DANG&tf=${tf}`));
      const after = Math.floor(Date.now() / 1000);
      expect(res.status).toBe(200);

      const { candles } = (await res.json()) as {
        candles: { time: number; open: number; high: number; low: number; close: number }[];
      };
      const last = candles[candles.length - 1]!;
      const step = candles[1]!.time - candles[0]!.time;
      const endSec = last.time + step; // the route's t1 for the final candle

      // ends at the route's "now" — no sample taken from the future
      expect(endSec).toBeGreaterThanOrEqual(before);
      expect(endSec).toBeLessThanOrEqual(after);

      // close equals the model evaluated at that end time (== the live price)
      expect(last.close).toBe(round2(priceAt("DANG", endSec * 1000) / KOBO_PER_NAIRA));
    },
  );

  it("rejects unknown symbols", async () => {
    const res = await GET(new Request("http://test/api/candles?symbol=EVIL&tf=1h"));
    expect(res.status).toBe(400);
  });
});
