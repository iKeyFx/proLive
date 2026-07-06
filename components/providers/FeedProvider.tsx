"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/store/hooks";
import { applyTicks, setStatus, snapshot } from "@/lib/store/pricesSlice";
import { buildSnapshot, tickAll } from "@/lib/feed/price-model";

// How often the tape refreshes. Driven by requestAnimationFrame (so it pauses
// when the tab is hidden), throttled to this cadence — one coalesced dispatch
// per interval keeps the store cheap and the render granular.
const TICK_MS = 300;

/**
 * Mounts the local price feed. Prices come from the deterministic time model, so
 * there is no socket to manage — the browser simply evaluates the same function
 * the server uses, on an rAF loop. A single `applyTicks` dispatch per interval
 * updates only the cells whose price changed.
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
