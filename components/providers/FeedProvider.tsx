"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/store/hooks";
import { applyTicks, setStatus, snapshot } from "@/lib/store/pricesSlice";
import { buildSnapshot, tickAll } from "@/lib/feed/price-model";

const TICK_MS = 300;

/**
 * Local price feed: evaluates the deterministic model on an rAF loop (pauses
 * when the tab is hidden) and dispatches one coalesced batch per interval.
 */
export function FeedProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Immediate snapshot so the UI renders real data on first paint.
    dispatch(snapshot(buildSnapshot(Date.now())));
    dispatch(setStatus("live"));

    let raf = 0;
    let last = 0;
    const loop = (ts: number) => {
      if (ts - last >= TICK_MS) {
        last = ts;
        dispatch(applyTicks(tickAll(Date.now())));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(raf);
  }, [dispatch]);

  return <>{children}</>;
}
