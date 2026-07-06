import Link from "next/link";
import { notFound } from "next/navigation";
import { getInstrument } from "@/lib/instruments";
import { PriceTape } from "@/components/market/PriceTape";
import { ChangePill } from "@/components/market/ChangePill";
import { CandleChart } from "@/components/instrument/CandleChart";
import { TradePanel } from "@/components/trade/TradePanel";

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const inst = getInstrument(symbol.toUpperCase());
  return { title: inst ? `${inst.symbol} · ${inst.name} — ProLive` : "Instrument — ProLive" };
}

export default async function InstrumentPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase();
  const inst = getInstrument(symbol);
  if (!inst) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 text-sm">
        <Link href="/" className="text-text-lo hover:text-text-hi">
          Market
        </Link>
        <span className="text-text-lo">/</span>
        <span className="font-display font-medium text-text-hi">{inst.symbol}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        {/* Chart + headline */}
        <div className="flex flex-col gap-4 rounded-lg border border-line bg-ink-800 p-4">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="font-display text-lg font-medium text-text-hi">{inst.name}</h1>
              <p className="text-xs text-text-lo">
                {inst.symbol} · {inst.sector}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <PriceTape symbol={symbol} size="xl" className="font-medium text-text-hi" />
              <ChangePill symbol={symbol} size={14} />
            </div>
          </div>
          <CandleChart symbol={symbol} />
        </div>

        {/* Inline trade panel */}
        <div className="lg:sticky lg:top-[120px] lg:self-start">
          <TradePanel symbol={symbol} name={inst.name} />
        </div>
      </div>
    </div>
  );
}
