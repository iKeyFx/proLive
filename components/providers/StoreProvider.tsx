"use client";

import { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "@/lib/store";
import { hydrate, type HoldingEntry, type OrderEntry } from "@/lib/store/accountSlice";

export interface InitialAccount {
  cashKobo: number;
  holdings: HoldingEntry[];
  orders: OrderEntry[];
}

export function StoreProvider({
  initialAccount,
  children,
}: {
  initialAccount: InitialAccount;
  children: React.ReactNode;
}) {
  const storeRef = useRef<AppStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = makeStore();
    storeRef.current.dispatch(hydrate(initialAccount));
  }
  return <Provider store={storeRef.current}>{children}</Provider>;
}
