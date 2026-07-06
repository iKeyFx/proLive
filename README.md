# ProLive — real-time trading & portfolio desk

A production-grade, real-time trading and portfolio dashboard. You watch live
market prices, place simulated trades, and track a portfolio with accurate, live
profit/loss. **No real money — but every money calculation behaves as if it
were.**

Three things were held above all else, in order:

1. **Money is always correct** — integer minor units end-to-end, no float drift, rounding tested.
2. **Real-time updates never jank** — ticks are coalesced per animation frame and only the affected cell re-renders.
3. **The interface is intentionally designed** — a "Precision Instrument" aesthetic, not a template.

---

## Stack

Next.js (App Router) · TypeScript (strict) · Tailwind CSS v4 · Redux Toolkit
(normalized) · Supabase (Postgres + Auth + RLS + Realtime) · Lightweight Charts ·
an in-house WebSocket price simulator.

---

## Architecture

```
                          ┌───────────────────────────────────────────┐
   price simulator        │                 BROWSER                   │
   (scripts/simulator.ts) │                                           │
   random-walk, kobo      │   FeedClient ──rAF coalesce──► Redux      │
        │   ▲             │   (WebSocket)                 (normalized  │
        │   │ GET /prices │                                by symbol)  │
   WS   │   │ (server     │       │ granular selectors        ▲        │
  ──────┼───┼─ trusts     │       ▼                           │        │
        │   │  this, not  │   PriceTape / Watchlist / Chart   │        │
        ▼   │  the client)│                                   │        │
   ┌────────┴───┐         │   TradePanel ──optimistic apply──►┘        │
   │  Next.js   │         └───────────┬───────────────────────────────┘
   │  server    │                     │ server action (validated, idempotent)
   │  actions   │◄────────────────────┘
   └─────┬──────┘   recompute cost with lib/money @ authoritative price
         │ RPC apply_trade (atomic, RLS, optimistic-concurrency, idempotency)
         ▼
   ┌──────────────────────────────────────────────┐
   │ Postgres: accounts · holdings · orders(ledger)│  ← RLS default-deny, owner-only
   │ CHECK(cash>=0, qty>=0)  +  Realtime publication│  → cross-tab sync back to store
   └──────────────────────────────────────────────┘
```

- **One-way price flow.** Simulator → WebSocket → client. Prices are *display
  data*, never persisted truth.
- **Persisted truth in Postgres.** Accounts, holdings, and an append-only order
  ledger — mutated only through validated, idempotent server actions / RPC.
- **Derived portfolio.** Value = Σ(qty × live price), computed client-side;
  holdings & cash sync across tabs via Supabase Realtime.

### Module map

| Path | Responsibility |
|---|---|
| `lib/money` | Integer-kobo money math + rounding policy (unit-tested) |
| `lib/realtime/feed-client.ts` | WebSocket + rAF tick coalescing + backoff reconnect |
| `lib/store` | Normalized Redux store, granular selectors |
| `lib/instruments.ts` | The single allow-list of tradable symbols |
| `scripts/simulator.ts` | In-house price feed (WS + `/prices` for server revalidation) |
| `supabase/migrations/0001_init.sql` | Schema, **RLS policies**, `apply_trade` RPC, reset/delete |
| `app/(app)/trade/actions.ts` | The validated, idempotent, race-safe trade server action |

---

## The three hard problems

### 1. Streaming without jank
The naive approach — dispatch every tick into Redux — repaints the world dozens
of times a second. Instead `FeedClient` drops incoming ticks into a pending map
(latest price per symbol wins) and flushes them as **one batch per animation
frame**. The store is normalized by symbol, and because Immer structurally shares
unchanged cells, a `bySymbol[symbol]` selector produces a new reference **only**
when that symbol moved. Net result: one ticking symbol re-renders one price cell,
not the table. The signature live tape rolls each digit like a mechanical counter
and settles in ~300 ms.

### 2. Money correctness
Every monetary value is an **integer in kobo**; quantities are integer
micro-units (1e6 = 1.0 unit). Floats are forbidden. Crucially, we never store a
*rounded average price* — we store the integer **cost basis** (sum of kobo
actually paid) and the integer quantity, and derive the average for display. Sums
are exact, so no rounding drift can accumulate. The one place division happens
(`divRound`, half-away-from-zero) is documented and unit-tested, including
fractional-quantity rounding, partial-sell basis apportionment, full-close
zeroing, and insufficient-funds paths.

### 3. The security model (never trust the browser)
- **RLS, default-deny, on every table.** Owner-only policies keyed on
  `auth.uid()`. The order ledger has SELECT + INSERT but no UPDATE/DELETE — it is
  structurally append-only.
- **Server revalidates everything.** The trade action fetches the **authoritative
  price server-side** (the client's price is display-only), rechecks buying power,
  and recomputes totals with `lib/money`.
- **Atomic + idempotent + race-safe.** `apply_trade` runs under the caller's RLS,
  takes a client idempotency key (unique constraint → a double-click never
  double-executes), uses optimistic concurrency (re-reads & retries on conflict),
  and DB `CHECK` constraints (`cash >= 0`, `qty >= 0`) are the final guard so even
  a logic bug cannot mint money.
- **Defence in depth:** middleware guards routes server-side *and* RLS guards data
  at the database. Service-role key is server-only (`server-only` import);
  the browser only ever gets the anon key. Security headers (CSP, frame-ancestors,
  HSTS, Referrer-Policy) are set in `next.config.ts`. Auth and order submission
  are rate-limited.

---

## Local setup (one command after env)

```bash
# 1. install
npm install

# 2. configure
cp .env.example .env.local        # then fill in your Supabase URL + keys

# 3. apply the database (RLS-first) — paste into the Supabase SQL editor:
#    supabase/migrations/0001_init.sql
#    (recommended: disable "Confirm email" in Supabase Auth for the demo)

# 4. (optional) seed a demo user with sample holdings
npm run seed                      # demo@prolive.test / prolive-demo-1234

# 5. run web + price feed together
npm run dev
```

- Web: http://localhost:3000 · Price feed: ws://localhost:4001
- `npm test` runs the money/reconciliation unit tests.
- `npm run build` is a clean production build.

### Environment

See [.env.example](.env.example). The browser receives only
`NEXT_PUBLIC_SUPABASE_ANON_KEY`; `SUPABASE_SERVICE_ROLE_KEY` is server-only and
never shipped to the client. No secrets live in the repo.

---

## Privacy

The only PII collected is the auth email. No third-party analytics, no tracking
of trade activity. RLS makes one user's data structurally invisible to another.
Logs carry identifiers and outcomes only — never emails, tokens, or request
bodies. **Account → Reset to seed** clears your own holdings & ledger; **Delete
account** removes every row you own.

---

## Design — "Precision Instrument"

The aesthetic of a finely engineered measuring tool: warm-graphite base (never
pure black), tabular monospace for *all* numbers so digits never reflow on a tick,
green/red reserved exclusively for market direction (always paired with an arrow
glyph for colour-blind users), and amber reserved strictly for interactive/brand
moments. Three deliberate typefaces — Space Grotesk (display), Geist (UI),
JetBrains Mono (data). Full keyboard operability, visible focus rings, and
`prefers-reduced-motion` honored everywhere (the tape collapses to an instant
swap).

---

## Hardest problem I solved

Reconciling **"money math lives in one tested TypeScript module"** with
**"trades must be atomic, idempotent, and race-safe in Postgres."** Those pull in
opposite directions: the obvious way to get atomicity is to do the arithmetic in
PL/pgSQL, which would duplicate (and risk diverging from) the rounding rules in
`lib/money`.

The resolution keeps all arithmetic in TypeScript. The server action reads the
current account/holding, computes the new absolute integers with `lib/money`
against a **server-fetched** price, then calls `apply_trade` passing both the new
values *and the expected current values it computed from*. The RPC performs an
**optimistic compare-and-set** under row locks: if the live state no longer
matches what we computed from, it raises `conflict` and the action re-reads and
retries; idempotency is enforced by a unique `(user_id, idempotency_key)` and a
concurrent-duplicate race rolls itself back so a trade can never double-apply. DB
`CHECK` constraints stand behind all of it as the invariant of last resort. The
money module stays the single source of truth, and the database stays the
authority on atomicity — neither one compromises the other.

---

## A note on `npm audit`

The reported advisories are all **dev-tooling only** (esbuild dev-server, vite/
vitest, postcss inside Next's build chain) — none are in the runtime money/auth/
order path, and the suggested "fixes" are breaking downgrades (`next@9`). They are
not in the shipped bundle, so they're intentionally left rather than breaking the
toolchain.
