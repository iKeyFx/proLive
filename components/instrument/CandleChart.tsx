"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
} from "lightweight-charts";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCell } from "@/lib/store/selectors";
import { KOBO_PER_NAIRA } from "@/lib/money";

type TF = "1m" | "5m" | "1h" | "1d";
const TIMEFRAMES: TF[] = ["1m", "5m", "1h", "1d"];

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface OHLC {
  open: number;
  high: number;
  low: number;
  close: number;
}

export function CandleChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastCandleRef = useRef<Candle | null>(null);

  const [tf, setTf] = useState<TF>("1h");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [readout, setReadout] = useState<OHLC | null>(null);

  const cell = useAppSelector(selectCell(symbol));
  const livePriceNaira = cell ? cell.price / KOBO_PER_NAIRA : null;

  // Create the chart once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#97a1a8",
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(42,48,54,0.5)" },
        horzLines: { color: "rgba(42,48,54,0.5)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#2a3036" },
      timeScale: { borderColor: "#2a3036", timeVisible: true, secondsVisible: false },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#3fb68b",
      downColor: "#e5604d",
      wickUpColor: "#3fb68b",
      wickDownColor: "#e5604d",
      borderVisible: false,
    });

    chart.subscribeCrosshairMove((param) => {
      const data = param.seriesData.get(series) as CandlestickData | undefined;
      if (data && "open" in data) {
        setReadout({ open: data.open, high: data.high, low: data.low, close: data.close });
      } else if (lastCandleRef.current) {
        const c = lastCandleRef.current;
        setReadout({ open: c.open, high: c.high, low: c.low, close: c.close });
      }
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Load candles when symbol or timeframe changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&tf=${tf}`)
      .then((r) => {
        if (!r.ok) throw new Error("bad response");
        return r.json() as Promise<{ candles: Candle[] }>;
      })
      .then(({ candles }) => {
        if (cancelled || !seriesRef.current) return;
        const data: CandlestickData[] = candles.map((c) => ({
          time: c.time as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        seriesRef.current.setData(data);
        lastCandleRef.current = candles[candles.length - 1] ?? null;
        chartRef.current?.timeScale().fitContent();
        const last = candles[candles.length - 1];
        if (last) setReadout({ open: last.open, high: last.high, low: last.low, close: last.close });
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, tf]);

  // Live-update the latest candle's close from the price feed.
  useEffect(() => {
    if (livePriceNaira === null || !seriesRef.current || !lastCandleRef.current) return;
    const c = lastCandleRef.current;
    const updated: Candle = {
      ...c,
      close: livePriceNaira,
      high: Math.max(c.high, livePriceNaira),
      low: Math.min(c.low, livePriceNaira),
    };
    lastCandleRef.current = updated;
    seriesRef.current.update({
      time: updated.time as Time,
      open: updated.open,
      high: updated.high,
      low: updated.low,
      close: updated.close,
    });
  }, [livePriceNaira]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Readout ohlc={readout} />
        <div role="tablist" aria-label="Timeframe" className="flex gap-1 rounded-md border border-line p-1">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tf === t}
              type="button"
              onClick={() => setTf(t)}
              className={`tnum rounded px-2.5 py-1 text-xs transition-colors ${
                tf === t ? "bg-ink-700 text-text-hi" : "text-text-lo hover:text-text-hi"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[320px] w-full overflow-hidden rounded-md border border-line bg-ink-900/40">
        <div ref={containerRef} className="absolute inset-0" />
        {loading && (
          <div className="absolute inset-0 grid place-items-center text-xs text-text-lo">
            <div className="skeleton h-full w-full" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center text-xs text-down">
            Couldn’t load the chart. Try another timeframe.
          </div>
        )}
      </div>
    </div>
  );
}

function Readout({ ohlc }: { ohlc: OHLC | null }) {
  if (!ohlc) return <div className="tnum text-xs text-text-lo">O — H — L — C —</div>;
  const fmt = (n: number) => n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const up = ohlc.close >= ohlc.open;
  return (
    <div className={`tnum flex gap-3 text-xs ${up ? "text-up" : "text-down"}`}>
      <span className="text-text-lo">
        O <span className="text-text-hi">{fmt(ohlc.open)}</span>
      </span>
      <span className="text-text-lo">
        H <span className="text-text-hi">{fmt(ohlc.high)}</span>
      </span>
      <span className="text-text-lo">
        L <span className="text-text-hi">{fmt(ohlc.low)}</span>
      </span>
      <span className="text-text-lo">
        C <span>{fmt(ohlc.close)}</span>
      </span>
    </div>
  );
}
