"use client";

import { useMemo, useState, useTransition } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { selectCash, selectCell, selectHolding } from "@/lib/store/selectors";
import {
  commitOptimistic,
  optimisticApply,
  revertOptimistic,
} from "@/lib/store/accountSlice";
import {
  applyBuy,
  applySell,
  formatNaira,
  formatQty,
  kobo,
  maxAffordableQty,
  qtyMicro,
  tradeCost,
  unitsToMicro,
  type Position,
} from "@/lib/money";
import { placeTrade } from "@/app/(app)/trade/actions";
import { useToast } from "@/components/ui/Toast";

type Side = "buy" | "sell";

export function TradePanel({ symbol, name }: { symbol: string; name: string }) {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const cell = useAppSelector(selectCell(symbol));
  const cash = useAppSelector(selectCash);
  const holding = useAppSelector(selectHolding(symbol));

  const [side, setSide] = useState<Side>("buy");
  const [qtyText, setQtyText] = useState("1");
  const [pending, startTransition] = useTransition();

  const priceKobo = cell?.price ?? 0;
  const heldMicro = holding?.qtyMicro ?? 0;

  // Parse the quantity input into micro-units; invalid/zero → null.
  const qtyMicroVal = useMemo(() => {
    const n = Number(qtyText);
    if (!Number.isFinite(n) || n <= 0) return null;
    return unitsToMicro(n);
  }, [qtyText]);

  const previewKobo =
    qtyMicroVal !== null && priceKobo > 0
      ? tradeCost(kobo(priceKobo), qtyMicro(qtyMicroVal))
      : 0;

  // Validation — mirrors the server's checks for instant feedback (the server
  // remains the source of truth and re-validates against the authoritative price).
  const validation = useMemo(() => {
    if (qtyMicroVal === null) return { ok: false, msg: "Enter a quantity above zero." };
    if (priceKobo <= 0) return { ok: false, msg: "Waiting for a live price…" };
    if (side === "buy" && previewKobo > cash) {
      const max = maxAffordableQty(kobo(cash), kobo(priceKobo));
      return { ok: false, msg: `Insufficient buying power — max ${formatQty(max)} units.` };
    }
    if (side === "sell" && qtyMicroVal > heldMicro) {
      return { ok: false, msg: `You only hold ${formatQty(qtyMicro(heldMicro))} units.` };
    }
    return { ok: true, msg: "" };
  }, [qtyMicroVal, priceKobo, side, previewKobo, cash, heldMicro]);

  const submit = () => {
    if (!validation.ok || qtyMicroVal === null) return;
    const qty = qtyMicro(qtyMicroVal);
    const priceK = kobo(priceKobo);
    const pos: Position = {
      qty: qtyMicro(heldMicro),
      costBasis: kobo(holding?.costBasisKobo ?? 0),
    };

    // Optimistic projection (client price) — realtime reconciles to truth after.
    let optimisticCash: number;
    let nextHolding: { symbol: string; qtyMicro: number; costBasisKobo: number } | null;
    if (side === "buy") {
      const r = applyBuy(pos, priceK, qty);
      optimisticCash = cash + r.cashDelta;
      nextHolding = { symbol, qtyMicro: r.position.qty, costBasisKobo: r.position.costBasis };
    } else {
      const r = applySell(pos, priceK, qty);
      optimisticCash = cash + r.cashDelta;
      nextHolding =
        r.position.qty === 0
          ? null
          : { symbol, qtyMicro: r.position.qty, costBasisKobo: r.position.costBasis };
    }

    dispatch(optimisticApply({ symbol, cashKobo: optimisticCash, holding: nextHolding }));

    const idempotencyKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    startTransition(async () => {
      const result = await placeTrade({
        symbol,
        side,
        qtyMicro: qtyMicroVal,
        idempotencyKey,
      });
      if (result.ok) {
        dispatch(commitOptimistic());
        const verb = side === "buy" ? "Bought" : "Sold";
        toast.show({
          tone: "ok",
          title: `${verb} ${formatQty(qty)} ${symbol}`,
          detail: `${formatNaira(kobo(result.totalKobo))} @ ${formatNaira(kobo(result.priceKobo))}`,
        });
      } else {
        dispatch(revertOptimistic());
        toast.show({ tone: "error", title: "Order not placed", detail: result.message });
      }
    });
  };

  const sideIsBuy = side === "buy";

  return (
    <section aria-labelledby="trade-h" className="rounded-lg border border-line bg-ink-800">
      <div className="border-b border-line px-4 py-3">
        <h2 id="trade-h" className="font-display text-sm font-medium">
          Trade <span className="text-text-lo">· {name}</span>
        </h2>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Side toggle */}
        <div role="tablist" aria-label="Order side" className="grid grid-cols-2 gap-1 rounded-md border border-line p-1">
          {(["buy", "sell"] as const).map((s) => {
            const active = side === s;
            const color = s === "buy" ? "text-up" : "text-down";
            return (
              <button
                key={s}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setSide(s)}
                className={`rounded px-3 py-2 text-sm font-medium capitalize transition-colors ${
                  active ? `bg-ink-700 ${color}` : "text-text-lo hover:text-text-hi"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>

        {/* Quantity */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="qty" className="text-xs uppercase tracking-wider text-text-lo">
            Quantity (units)
          </label>
          <input
            id="qty"
            inputMode="decimal"
            value={qtyText}
            onChange={(e) => setQtyText(e.target.value.replace(/[^0-9.]/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="tnum rounded-md border border-line bg-ink-900 px-3 py-2.5 text-right text-lg text-text-hi outline-none focus:border-signal"
          />
        </div>

        {/* Live preview */}
        <dl className="flex flex-col gap-2 rounded-md border border-line bg-ink-900/60 p-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-text-lo">Live price</dt>
            <dd className="tnum text-text-hi">{priceKobo > 0 ? formatNaira(kobo(priceKobo)) : "—"}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-text-lo">{sideIsBuy ? "Estimated cost" : "Estimated proceeds"}</dt>
            <dd className="tnum font-medium text-text-hi">{formatNaira(kobo(previewKobo))}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-line pt-2">
            <dt className="text-text-lo">{sideIsBuy ? "Buying power" : "Units held"}</dt>
            <dd className="tnum text-text-lo">
              {sideIsBuy ? formatNaira(kobo(cash)) : formatQty(qtyMicro(heldMicro))}
            </dd>
          </div>
        </dl>

        {!validation.ok && (
          <p role="status" className="text-xs text-down">
            {validation.msg}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!validation.ok || pending}
          className={`rounded-md px-4 py-2.5 font-medium text-ink-900 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${
            sideIsBuy ? "bg-up" : "bg-down"
          }`}
        >
          {pending ? "Placing…" : sideIsBuy ? `Buy ${symbol}` : `Sell ${symbol}`}
        </button>
        <p className="text-center text-[11px] text-text-lo">
          Executes at the live server price, which may differ slightly.
        </p>
      </div>
    </section>
  );
}
