import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { InitialAccount } from "@/components/providers/StoreProvider";
import type { HoldingRow, OrderRow } from "@/lib/supabase/types";

type CashOnly = { cash_kobo: number };
type HoldingPick = Pick<HoldingRow, "symbol" | "qty_micro" | "cost_basis_kobo">;
type OrderPick = Pick<
  OrderRow,
  "id" | "symbol" | "side" | "qty_micro" | "price_kobo" | "total_kobo" | "created_at"
>;

export interface LoadedAccount {
  userId: string;
  email: string;
  account: InitialAccount;
}

/**
 * Loads the signed-in user's account, holdings, and recent ledger — server-side,
 * under RLS. Returns only the fields the UI needs (least exposure). The explicit
 * user_id filters are redundant given RLS but make intent obvious and keep the
 * query tight.
 */
export async function loadAccount(): Promise<LoadedAccount | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [accRes, holdRes, ordRes] = await Promise.all([
    supabase.from("accounts").select("cash_kobo").eq("user_id", user.id).single(),
    supabase
      .from("holdings")
      .select("symbol, qty_micro, cost_basis_kobo")
      .eq("user_id", user.id),
    supabase
      .from("orders")
      .select("id, symbol, side, qty_micro, price_kobo, total_kobo, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  // The typed query builder over a hand-written Database type degrades select
  // inference to `never`; narrow explicitly to the exact picked shapes.
  const cash = (accRes.data as CashOnly | null)?.cash_kobo ?? 0;
  const holdings = (holdRes.data as HoldingPick[] | null) ?? [];
  const orders = (ordRes.data as OrderPick[] | null) ?? [];

  return {
    userId: user.id,
    email: user.email ?? "",
    account: {
      cashKobo: cash,
      holdings: holdings.map((h) => ({
        symbol: h.symbol,
        qtyMicro: h.qty_micro,
        costBasisKobo: h.cost_basis_kobo,
      })),
      orders: orders.map((o) => ({
        id: o.id,
        symbol: o.symbol,
        side: o.side,
        qtyMicro: o.qty_micro,
        priceKobo: o.price_kobo,
        totalKobo: o.total_kobo,
        createdAt: o.created_at,
      })),
    },
  };
}
