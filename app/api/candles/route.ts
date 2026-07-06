import { NextResponse } from "next/server";
import { z } from "zod";
import { getInstrument, isKnownSymbol } from "@/lib/instruments";
import { fetchAuthoritativePrice } from "@/lib/server/price";
import { KOBO_PER_NAIRA } from "@/lib/money";

/**
 * Synthetic OHLC history for the detail chart. Deterministic per (symbol,tf) via
 * a seeded walk so reloads are stable, then anchored so the latest close equals
 * the current live price. Values are naira floats (the chart's axis), not money
 * we ever compute with — display only.
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

function seeded(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashSymbol(symbol: string, tf: string): number {
  let h = 2166136261;
  for (const ch of `${symbol}:${tf}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

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
  const inst = getInstrument(symbol)!;
  const { stepSec, count } = TF[tf]!;

  // Anchor to the live price if the feed is up; else fall back to the seed.
  const livePrice = await fetchAuthoritativePrice(symbol);
  const anchorNaira = (livePrice ?? inst.seedPrice) / KOBO_PER_NAIRA;

  const rand = seeded(hashSymbol(symbol, tf));
  const vol = inst.vol;

  // Build closes by walking backward from the anchor, then reverse.
  const closes: number[] = [anchorNaira];
  for (let i = 1; i < count; i++) {
    const prev = closes[i - 1]!;
    const drift = (rand() - 0.5) * 2 * vol * prev * 1.4;
    const next = Math.max(prev - drift, prev * 0.5, 1);
    closes.push(next);
  }
  closes.reverse(); // oldest → newest, newest === anchor

  const nowSec = Math.floor(Date.now() / 1000);
  const startSec = nowSec - stepSec * (count - 1);

  const candles = closes.map((close, i) => {
    const open = i === 0 ? close * (1 + (rand() - 0.5) * vol) : closes[i - 1]!;
    const body = Math.abs(close - open);
    const wick = body * (0.4 + rand() * 1.2) + close * vol * 0.3;
    const high = Math.max(open, close) + rand() * wick;
    const low = Math.min(open, close) - rand() * wick;
    return {
      time: startSec + i * stepSec,
      open: round2(open),
      high: round2(high),
      low: round2(Math.max(low, 0.5)),
      close: round2(close),
    };
  });

  return NextResponse.json(
    { symbol, tf, candles },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
