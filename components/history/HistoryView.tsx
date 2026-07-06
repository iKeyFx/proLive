"use client";

import { useAppSelector } from "@/lib/store/hooks";
import { selectOrders } from "@/lib/store/selectors";
import { formatNaira, formatQty, kobo, qtyMicro } from "@/lib/money";
import { ArrowUp, ArrowDown } from "@/components/icons";

export function HistoryView() {
  const orders = useAppSelector(selectOrders);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-lg font-medium">History</h1>
        <p className="text-sm text-text-lo">Your executed orders. This ledger is append-only and never edited.</p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-ink-800/40 px-6 py-16 text-center">
          <p className="font-display text-base text-text-hi">No orders yet</p>
          <p className="mt-1 text-sm text-text-lo">Your trades will appear here as soon as you place one.</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-lg border border-line bg-ink-800">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-wider text-text-lo">
                <th className="py-2 pl-4 text-left font-normal">Time</th>
                <th className="px-2 py-2 text-left font-normal">Instrument</th>
                <th className="px-2 py-2 text-left font-normal">Side</th>
                <th className="px-2 py-2 text-right font-normal">Qty</th>
                <th className="hidden px-2 py-2 text-right font-normal sm:table-cell">Price</th>
                <th className="py-2 pr-4 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const buy = o.side === "buy";
                return (
                  <tr key={o.id} className="border-b border-line/60">
                    <td className="tnum py-2.5 pl-4 text-xs text-text-lo">
                      {new Date(o.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      })}
                    </td>
                    <td className="px-2 py-2.5 font-display text-sm font-medium text-text-hi">{o.symbol}</td>
                    <td className="px-2 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs ${buy ? "text-up" : "text-down"}`}>
                        {buy ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {buy ? "Buy" : "Sell"}
                      </span>
                    </td>
                    <td className="tnum px-2 py-2.5 text-right text-text-hi">{formatQty(qtyMicro(o.qtyMicro))}</td>
                    <td className="tnum hidden px-2 py-2.5 text-right text-text-lo sm:table-cell">
                      {formatNaira(kobo(o.priceKobo))}
                    </td>
                    <td className="tnum py-2.5 pr-4 text-right text-text-hi">{formatNaira(kobo(o.totalKobo))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
