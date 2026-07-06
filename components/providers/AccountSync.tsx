"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppDispatch } from "@/lib/store/hooks";
import {
  prependOrder,
  removeHolding,
  syncCash,
  syncHolding,
} from "@/lib/store/accountSlice";
import type { AccountRow, HoldingRow, OrderRow } from "@/lib/supabase/types";

/**
 * Cross-tab sync: subscribes to postgres changes on the user's own rows (RLS
 * scopes the events) and folds them into the store, so a trade placed in one
 * tab appears in another without a refresh.
 */
export function AccountSync({ userId }: { userId: string }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`account:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "accounts", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as AccountRow;
          if (row?.cash_kobo != null) dispatch(syncCash(row.cash_kobo));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "holdings", filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as Partial<HoldingRow>;
            if (old?.symbol) dispatch(removeHolding(old.symbol));
            return;
          }
          const row = payload.new as HoldingRow;
          dispatch(
            syncHolding({
              symbol: row.symbol,
              qtyMicro: row.qty_micro,
              costBasisKobo: row.cost_basis_kobo,
            }),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as OrderRow;
          dispatch(
            prependOrder({
              id: row.id,
              symbol: row.symbol,
              side: row.side,
              qtyMicro: row.qty_micro,
              priceKobo: row.price_kobo,
              totalKobo: row.total_kobo,
              createdAt: row.created_at,
            }),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [dispatch, userId]);

  return null;
}
