import { NextResponse } from "next/server";
import { z } from "zod";
import { isKnownSymbol } from "@/lib/instruments";
import { priceAt } from "@/lib/feed/price-model";
import { KOBO_PER_NAIRA } from "@/lib/money";

/**
 * OHLC history for the detail chart, sampled directly from the deterministic
 * price model so it is coherent with the live price and stable across reloads.
 * Values are naira floats (the chart axis) — display only, never money we
 * compute with.
 */
const query = z.object({
  symbol: z.string().refine(isKnownSymbol),
  tf: z.enum(["1m", "5m", "1h", "1d"]).default("1h"),
});

const TF: Record<string, { stepSec: number; count: number }> = {
  "1m": { stepSec: 60, count: 90 },
  "5m": { stepSec: 300, count: 90 },
  "1h": { stepSec: 3600, count: 96 },
  "1d": { stepSec: 86400, count: 90 },
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = query.safeParse({
    symbol: url.searchParams.get("symbol"),
    tf: url.searchParams.get("tf") ?? "1h",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
  }
  const { symbol, tf } = parsed.data;
  const { stepSec, count } = TF[tf]!;

  const nowSec = Math.floor(Date.now() / 1000);
  // Buckets span [t0, t0+step]; start one full step back so the FINAL candle's
  // t1 lands exactly on nowSec — no sample is ever taken from the future.
  const startSec = nowSec - stepSec * count;
  const SUBSAMPLES = 6; // intra-bucket points → realistic wicks

  const candles = Array.from({ length: count }, (_, i) => {
    const t0 = (startSec + i * stepSec) * 1000;
    const t1 = t0 + stepSec * 1000;
    const open = priceAt(symbol, t0) / KOBO_PER_NAIRA;
    const close = priceAt(symbol, t1) / KOBO_PER_NAIRA;

    let high = Math.max(open, close);
    let low = Math.min(open, close);
    for (let s = 1; s < SUBSAMPLES; s++) {
      const p = priceAt(symbol, t0 + (stepSec * 1000 * s) / SUBSAMPLES) / KOBO_PER_NAIRA;
      if (p > high) high = p;
      if (p < low) low = p;
    }

    return {
      time: startSec + i * stepSec,
      open: round2(open),
      high: round2(high),
      low: round2(Math.max(low, 0.5)),
      close: round2(close),
    };
  });

  return NextResponse.json({ symbol, tf, candles }, { headers: { "Cache-Control": "no-store" } });
}
