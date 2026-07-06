"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { authoritativePrice } from "@/lib/server/price";
import { rateLimit, sweepExpired } from "@/lib/rate-limit";
import { isKnownSymbol } from "@/lib/instruments";
import type { Database } from "@/lib/supabase/types";
import {
  applyBuy,
  applySell,
  kobo,
  qtyMicro,
  maxAffordableQty,
  formatQty,
  type Position,
} from "@/lib/money";

// ── Input contract — narrowed at the boundary; reject, never coerce. ─────────
const tradeSchema = z.object({
  symbol: z.string().refine(isKnownSymbol, "Unknown symbol."),
  side: z.enum(["buy", "sell"]),
  // qty in micro-units: positive integer, capped to a sane ceiling.
  qtyMicro: z.number().int().positive().max(1_000_000_000_000),
  // client-generated idempotency key (uuid)
  idempotencyKey: z.string().min(8).max(64),
});

export type TradeInput = z.infer<typeof tradeSchema>;

export type TradeErrorCode =
  | "invalid"
  | "rate_limited"
  | "unauthenticated"
  | "price_unavailable"
  | "insufficient_funds"
  | "insufficient_holding"
  | "conflict"
  | "server";

export type TradeResult =
  | {
      ok: true;
      status: "applied" | "duplicate";
      orderId: string;
      symbol: string;
      side: "buy" | "sell";
      qtyMicro: number;
      priceKobo: number;
      totalKobo: number;
    }
  | { ok: false; code: TradeErrorCode; message: string };

const MAX_CONFLICT_RETRIES = 4;

export async function placeTrade(rawInput: TradeInput): Promise<TradeResult> {
  const parsed = tradeSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, code: "invalid", message: parsed.error.issues[0]?.message ?? "Invalid order." };
  }
  const { symbol, side, idempotencyKey } = parsed.data;
  const qty = qtyMicro(parsed.data.qtyMicro);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: "unauthenticated", message: "Please sign in again." };
  }

  // Throttle order submission per user (20 / 10s) — blunts double-click storms
  // and scripted abuse without hampering normal trading.
  sweepExpired();
  if (!rateLimit(`order:${user.id}`, 20, 10_000).ok) {
    return { ok: false, code: "rate_limited", message: "Slow down — too many orders. Try again shortly." };
  }

  // Authoritative price — server-computed from the model, never the client's.
  const price = authoritativePrice(symbol);
  if (price === null) {
    return { ok: false, code: "price_unavailable", message: "Price feed unavailable. Try again in a moment." };
  }
  const priceK = kobo(price);

  for (let attempt = 0; attempt < MAX_CONFLICT_RETRIES; attempt++) {
    // Read current truth under RLS (the user's own rows only).
    const [accRes, holdRes] = await Promise.all([
      supabase.from("accounts").select("cash_kobo").eq("user_id", user.id).single(),
      supabase
        .from("holdings")
        .select("qty_micro, cost_basis_kobo")
        .eq("user_id", user.id)
        .eq("symbol", symbol)
        .maybeSingle(),
    ]);

    const cash = (accRes.data as { cash_kobo: number } | null)?.cash_kobo;
    if (cash === undefined || cash === null) {
      return { ok: false, code: "server", message: "Account not found." };
    }
    const heldRow = holdRes.data as { qty_micro: number; cost_basis_kobo: number } | null;
    const pos: Position = {
      qty: qtyMicro(heldRow?.qty_micro ?? 0),
      costBasis: kobo(heldRow?.cost_basis_kobo ?? 0),
    };

    // Recompute everything server-side with the trusted price.
    let newCash: number;
    let newQty: number;
    let newBasis: number;
    let totalKobo: number;

    if (side === "buy") {
      const r = applyBuy(pos, priceK, qty);
      totalKobo = -r.cashDelta; // positive cost
      newCash = cash + r.cashDelta; // cashDelta is negative
      if (newCash < 0) {
        const max = maxAffordableQty(kobo(cash), priceK);
        return {
          ok: false,
          code: "insufficient_funds",
          message: `Insufficient buying power — max ${formatQty(max)} units.`,
        };
      }
      newQty = r.position.qty;
      newBasis = r.position.costBasis;
    } else {
      if (qty > pos.qty) {
        return {
          ok: false,
          code: "insufficient_holding",
          message: `You only hold ${formatQty(pos.qty)} units.`,
        };
      }
      const r = applySell(pos, priceK, qty);
      totalKobo = r.cashDelta; // proceeds
      newCash = cash + r.cashDelta;
      newQty = r.position.qty;
      newBasis = r.position.costBasis;
    }

    // Params are fully type-checked against the function's Args here…
    const params: Database["public"]["Functions"]["apply_trade"]["Args"] = {
      p_symbol: symbol,
      p_side: side,
      p_qty_micro: qty,
      p_price_kobo: price,
      p_total_kobo: totalKobo,
      p_idempotency_key: idempotencyKey,
      p_expected_cash: cash,
      p_new_cash: newCash,
      p_expected_qty: pos.qty,
      p_expected_basis: pos.costBasis,
      p_new_qty: newQty,
      p_new_basis: newBasis,
    };
    // …then handed to rpc with one localized cast: postgrest-js's RPC arg
    // inference doesn't resolve against a hand-authored Database type (it
    // defaults Args to `never`). Runtime is unaffected; the object above is typed.
    const { data, error } = (await supabase.rpc("apply_trade", params as never)) as {
      data: { order_id: string; status: string }[] | null;
      error: { message: string } | null;
    };

    if (error) {
      const msg = error.message ?? "";
      // Optimistic-concurrency miss: state moved under us — re-read and retry.
      if (msg.includes("conflict")) continue;
      // Concurrent duplicate lost the unique race and rolled back: the other
      // transaction already applied this exact order → report idempotent success.
      if (msg.includes("duplicate")) {
        return {
          ok: true,
          status: "duplicate",
          orderId: "",
          symbol,
          side,
          qtyMicro: qty,
          priceKobo: price,
          totalKobo,
        };
      }
      if (msg.includes("unauthenticated")) {
        return { ok: false, code: "unauthenticated", message: "Please sign in again." };
      }
      return { ok: false, code: "server", message: "Could not place the order. Please try again." };
    }

    const row = (data as { order_id: string; status: string }[] | null)?.[0];
    return {
      ok: true,
      status: row?.status === "duplicate" ? "duplicate" : "applied",
      orderId: row?.order_id ?? "",
      symbol,
      side,
      qtyMicro: qty,
      priceKobo: price,
      totalKobo,
    };
  }

  return { ok: false, code: "conflict", message: "Busy account — please try that again." };
}

// ── Account maintenance actions (reset / delete) ────────────────────────────
export async function resetAccount(): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };
  const { error } = await supabase.rpc("reset_account");
  if (error) return { ok: false, message: "Reset failed. Try again." };
  return { ok: true };
}

export async function deleteAccountData(): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };
  const { error } = await supabase.rpc("delete_account_data");
  if (error) return { ok: false, message: "Delete failed. Try again." };
  await supabase.auth.signOut();
  return { ok: true };
}
