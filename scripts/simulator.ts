/**
 * In-house price simulator.
 *
 * A server-side random-walk streamer. Owns no truth: it only produces *display*
 * prices in integer kobo. It exposes two surfaces on one port:
 *   • WebSocket  — the browser subscribes; gets a snapshot then coalesced ticks.
 *   • GET /prices — the Next.js server fetches this to revalidate price at trade
 *     execution. The browser's claimed price is NEVER trusted; this is the
 *     authoritative read used to recompute cost server-side.
 *   • GET /health — liveness.
 *
 * Run standalone:  node --import tsx scripts/simulator.ts
 * (relative imports + `import type` in shared modules keep this free of the
 *  Next.js "@/" path alias, so it runs as a plain Node process.)
 */
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { INSTRUMENTS } from "../lib/instruments";
import type { FeedMessage, PricePoint, TickMessage } from "../lib/feed/types";

// Hosts (Railway/Render/Fly) inject $PORT and require the process to bind it;
// fall back to FEED_WS_PORT locally.
const PORT = Number(process.env.PORT ?? process.env.FEED_WS_PORT ?? 4001);
const TICK_MS = 350; // server cadence; client batches these per rAF
const SPARK_LEN = 40; // points retained per symbol for sparklines
const FLOOR_KOBO = 100; // never let a price fall through ₦1.00

interface SymbolState {
  price: number; // current, kobo (int)
  open: number; // 24h reference, kobo (int)
  spark: number[]; // recent prices, oldest → newest
}

const state = new Map<string, SymbolState>();
for (const inst of INSTRUMENTS) {
  state.set(inst.symbol, {
    price: inst.seedPrice,
    open: inst.seedPrice,
    spark: Array.from({ length: SPARK_LEN }, () => inst.seedPrice),
  });
}

// Standard normal via Box–Muller.
function gauss(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Advance one symbol by one step. Mean-reverting random walk, integer kobo. */
function step(symbol: string): { moved: boolean; price: number; prev: number } {
  const s = state.get(symbol)!;
  const inst = INSTRUMENTS.find((i) => i.symbol === symbol)!;
  const prev = s.price;

  const reversion = (s.open - s.price) * 0.002; // gentle pull toward open
  const shock = gauss() * inst.vol * s.price * 0.15; // vol-scaled shock
  let next = Math.round(s.price + reversion + shock);
  if (next < FLOOR_KOBO) next = FLOOR_KOBO;

  s.price = next;
  s.spark.push(next);
  if (s.spark.length > SPARK_LEN) s.spark.shift();

  return { moved: next !== prev, price: next, prev };
}

function snapshot(): FeedMessage {
  const prices: Record<string, PricePoint> = {};
  const spark: Record<string, number[]> = {};
  const ts = Date.now();
  for (const [symbol, s] of state) {
    prices[symbol] = { price: s.price, open: s.open, ts };
    spark[symbol] = [...s.spark];
  }
  return { type: "snapshot", prices, spark };
}

/** Plain { symbol: priceKobo } book for server-side revalidation. */
function priceBook(): Record<string, number> {
  const book: Record<string, number> = {};
  for (const [symbol, s] of state) book[symbol] = s.price;
  return book;
}

// ── HTTP + WS share one port ────────────────────────────────────────────────
const httpServer = createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  // Same-origin server-to-server use; no credentials, so a permissive CORS is fine.
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.url === "/prices") {
    res.end(JSON.stringify({ ts: Date.now(), prices: priceBook() }));
    return;
  }
  if (req.url === "/health") {
    res.end(JSON.stringify({ ok: true, symbols: state.size }));
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ error: "not found" }));
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws: WebSocket) => {
  ws.send(JSON.stringify(snapshot())); // render real data immediately
});

function broadcast(msg: FeedMessage): void {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  }
}

setInterval(() => {
  const updates: TickMessage["updates"] = [];
  for (const inst of INSTRUMENTS) {
    if (Math.random() < 0.7) {
      const { moved, price, prev } = step(inst.symbol);
      if (moved) updates.push({ symbol: inst.symbol, price, prev });
    }
  }
  if (updates.length > 0) broadcast({ type: "tick", ts: Date.now(), updates });
}, TICK_MS);

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[simulator] ws + http on http://localhost:${PORT} (ws upgrade, GET /prices)`);
});

function shutdown(): void {
  // eslint-disable-next-line no-console
  console.log("\n[simulator] shutting down");
  wss.close();
  httpServer.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
