import type { ConnectionStatus } from "@/lib/store/pricesSlice";
import type { FeedMessage, SnapshotMessage } from "@/lib/feed/types";

interface FeedHandlers {
  onSnapshot: (msg: SnapshotMessage) => void;
  /** Receives a coalesced batch — at most once per animation frame. */
  onTicks: (updates: Array<{ symbol: string; price: number; prev: number }>) => void;
  onStatus: (status: ConnectionStatus) => void;
}

/**
 * LEGACY — not used by the app. The production feed is the deterministic
 * in-process model (lib/feed/price-model.ts). Kept as the WebSocket variant:
 * rAF tick coalescing (pending map, one flush per frame) and auto-reconnect
 * with capped exponential backoff + jitter. Pairs with scripts/simulator.ts.
 */
export class FeedClient {
  private url: string;
  private handlers: FeedHandlers;
  private ws: WebSocket | null = null;
  private pending = new Map<string, { price: number; prev: number }>();
  private rafHandle: number | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private closedByUser = false;

  constructor(url: string, handlers: FeedHandlers) {
    this.url = url;
    this.handlers = handlers;
  }

  connect(): void {
    this.closedByUser = false;
    this.open();
  }

  private open(): void {
    this.handlers.onStatus(this.attempt === 0 ? "connecting" : "reconnecting");
    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.attempt = 0;
    };

    this.ws.onmessage = (event: MessageEvent<string>) => {
      let msg: FeedMessage;
      try {
        msg = JSON.parse(event.data) as FeedMessage;
      } catch {
        return; // ignore malformed frames
      }
      if (msg.type === "snapshot") {
        this.handlers.onSnapshot(msg);
      } else {
        for (const u of msg.updates) {
          const existing = this.pending.get(u.symbol);
          // keep the earliest `prev` of the frame, the latest `price`
          this.pending.set(u.symbol, { price: u.price, prev: existing?.prev ?? u.prev });
        }
        this.scheduleFlush();
      }
    };

    this.ws.onclose = () => {
      if (!this.closedByUser) this.scheduleReconnect();
    };
    this.ws.onerror = () => {
      // onclose will follow; let it drive reconnect.
      this.ws?.close();
    };
  }

  private scheduleFlush(): void {
    if (this.rafHandle !== null) return;
    const raf =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number;
    this.rafHandle = raf(() => {
      this.rafHandle = null;
      if (this.pending.size === 0) return;
      const batch = Array.from(this.pending, ([symbol, v]) => ({
        symbol,
        price: v.price,
        prev: v.prev,
      }));
      this.pending.clear();
      this.handlers.onTicks(batch);
    });
  }

  private scheduleReconnect(): void {
    this.handlers.onStatus("reconnecting");
    this.attempt += 1;
    const backoff = Math.min(10_000, 300 * 2 ** Math.min(this.attempt, 6));
    const jitter = Math.random() * 300;
    this.reconnectTimer = setTimeout(() => this.open(), backoff + jitter);
  }

  close(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.rafHandle !== null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(this.rafHandle);
    }
    this.ws?.close();
    this.ws = null;
  }
}
