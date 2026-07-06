"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppStore } from "@/lib/store/hooks";
import { applyTicks, setStatus, snapshot } from "@/lib/store/pricesSlice";
import { FeedClient } from "@/lib/realtime/feed-client";
import { publicEnv } from "@/lib/env";

const STALE_AFTER_MS = 6000;

/**
 * Mounts the price feed for the app subtree. Dispatches snapshots and rAF-batched
 * tick batches, and degrades to 'stale' if the socket goes quiet while nominally
 * connected (so the UI flags last-known prices instead of lying). A fresh tick
 * flips status back to 'live' automatically.
 */
export function FeedProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const store = useAppStore();

  useEffect(() => {
    const client = new FeedClient(publicEnv.feedWsUrl, {
      onSnapshot: (msg) => dispatch(snapshot(msg)),
      onTicks: (updates) => dispatch(applyTicks(updates)),
      onStatus: (status) => dispatch(setStatus(status)),
    });
    client.connect();

    const watchdog = setInterval(() => {
      const { status, lastMessageTs } = store.getState().prices;
      if (status === "live" && lastMessageTs > 0 && Date.now() - lastMessageTs > STALE_AFTER_MS) {
        dispatch(setStatus("stale"));
      }
    }, 2000);

    return () => {
      clearInterval(watchdog);
      client.close();
    };
  }, [dispatch, store]);

  return <>{children}</>;
}
