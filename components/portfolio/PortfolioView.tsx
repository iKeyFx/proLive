"use client";

import Link from "next/link";
import { useAppSelector } from "@/lib/store/hooks";
import { selectHoldingSymbols, selectLoaded, selectPortfolioTotals } from "@/lib/store/selectors";
import { getInstrument } from "@/lib/instruments";
import { formatNaira, formatPercent, formatSignedNaira, kobo, pnlPercent } from "@/lib/money";
import { HoldingRow } from "@/components/portfolio/HoldingRow";

function Kpi({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "up" | "down" }) {
  const color = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-text-hi";
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-line bg-ink-800 p-4">
      <span className="text-[10px] uppercase tracking-wider text-text-lo">{label}</span>
      <span className={`tnum text-xl font-medium ${color}`}>{value}</span>
    </div>
  );
}

export function PortfolioView() {
  const symbols = useAppSelector(selectHoldingSymbols);
  const totals = useAppSelector(selectPortfolioTotals);
  const loaded = useAppSelector(selectLoaded);

  const pnl = kobo(totals.unrealizedKobo);
  const pct = pnlPercent(pnl, kobo(totals.costBasisKobo));
  const tone = totals.unrealizedKobo > 0 ? "up" : totals.unrealizedKobo < 0 ? "down" : "neutral";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-lg font-medium">Portfolio</h1>
        <p className="text-sm text-text-lo">Live value and unrealized profit/loss across your holdings.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total value" value={formatNaira(kobo(totals.totalKobo))} />
        <Kpi label="Invested" value={formatNaira(kobo(totals.investedKobo))} />
        <Kpi label="Cash" value={formatNaira(kobo(totals.cashKobo))} />
        <Kpi
          label="Unrealized P/L"
          value={`${formatSignedNaira(pnl)} (${formatPercent(pct)})`}
          tone={tone}
        />
      </div>

      {symbols.length === 0 ? (
        <EmptyPortfolio loaded={loaded} />
      ) : (
        <section className="overflow-hidden rounded-lg border border-line bg-ink-800">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-wider text-text-lo">
                <th className="py-2 pl-4 text-left font-normal">Instrument</th>
                <th className="px-2 py-2 text-right font-normal">Qty</th>
                <th className="hidden px-2 py-2 text-right font-normal sm:table-cell">Avg entry</th>
                <th className="px-2 py-2 text-right font-normal">Price</th>
                <th className="hidden px-2 py-2 text-right font-normal md:table-cell">Value</th>
                <th className="py-2 pr-4 text-right font-normal">Unrealized P/L</th>
              </tr>
            </thead>
            <tbody>
              {symbols.map((s) => (
                <HoldingRow key={s} symbol={s} name={getInstrument(s)?.name ?? s} />
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function EmptyPortfolio({ loaded }: { loaded: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line bg-ink-800/40 px-6 py-16 text-center">
      <p className="font-display text-base text-text-hi">
        {loaded ? "Your portfolio is empty" : "Loading your portfolio…"}
      </p>
      <p className="max-w-sm text-sm text-text-lo">
        Place your first trade from any instrument to start tracking live value and P/L here.
      </p>
      <Link
        href="/"
        className="mt-1 rounded-md bg-signal px-4 py-2 text-sm font-medium text-ink-900 hover:opacity-90"
      >
        Browse the market
      </Link>
    </div>
  );
}
