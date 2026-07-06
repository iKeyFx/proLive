-- ============================================================================
-- ProLive — schema, Row Level Security, and the atomic trade RPC.
--
-- Security model (server-trust): the browser is hostile. Every table has RLS
-- enabled with DEFAULT-DENY (RLS on + only owner policies → no cross-user
-- access is possible, even with a crafted request). Money invariants
-- (non-negative cash / qty) are enforced as DB CHECK constraints — the last
-- line of defence, so even a server logic bug cannot mint money.
--
-- Money is integer kobo. Quantity is integer micro-units (1e6 = 1.0 unit).
-- The orders table is an append-only audit ledger: RLS grants SELECT + INSERT
-- to the owner but NO update/delete. The only way ledger rows are ever removed
-- is the user's own explicit reset/delete flows, via SECURITY DEFINER functions
-- scoped strictly to auth.uid().
-- ============================================================================

-- Seed cash granted to a new account: ₦5,000,000.00 = 500,000,000 kobo.
-- (kept here as the single source for the value used by the signup trigger)

-- ── accounts ────────────────────────────────────────────────────────────────
create table if not exists public.accounts (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  cash_kobo  bigint not null default 500000000 check (cash_kobo >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── holdings ────────────────────────────────────────────────────────────────
create table if not exists public.holdings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  symbol          text not null,
  qty_micro       bigint not null check (qty_micro >= 0),
  cost_basis_kobo bigint not null check (cost_basis_kobo >= 0),
  updated_at      timestamptz not null default now(),
  unique (user_id, symbol)
);
create index if not exists holdings_user_idx on public.holdings (user_id);

-- ── orders (append-only audit ledger) ───────────────────────────────────────
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  symbol          text not null,
  side            text not null check (side in ('buy', 'sell')),
  qty_micro       bigint not null check (qty_micro > 0),
  price_kobo      bigint not null check (price_kobo > 0),
  total_kobo      bigint not null check (total_kobo > 0),
  idempotency_key text not null,
  created_at      timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index if not exists orders_user_created_idx
  on public.orders (user_id, created_at desc);

-- ============================================================================
-- Row Level Security — enable everywhere, then write explicit owner policies.
-- With RLS enabled and no permissive policy for an action, that action is
-- denied by default. We rely on that for orders UPDATE/DELETE (never allowed).
-- ============================================================================
alter table public.accounts enable row level security;
alter table public.holdings enable row level security;
alter table public.orders   enable row level security;

-- accounts: owner may read + update own row. Inserts happen via the signup
-- trigger (SECURITY DEFINER); no client INSERT/DELETE policy is granted.
drop policy if exists accounts_select_own on public.accounts;
create policy accounts_select_own on public.accounts
  for select using (auth.uid() = user_id);

drop policy if exists accounts_update_own on public.accounts;
create policy accounts_update_own on public.accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- holdings: owner full CRUD on own rows only.
drop policy if exists holdings_select_own on public.holdings;
create policy holdings_select_own on public.holdings
  for select using (auth.uid() = user_id);

drop policy if exists holdings_insert_own on public.holdings;
create policy holdings_insert_own on public.holdings
  for insert with check (auth.uid() = user_id);

drop policy if exists holdings_update_own on public.holdings;
create policy holdings_update_own on public.holdings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists holdings_delete_own on public.holdings;
create policy holdings_delete_own on public.holdings
  for delete using (auth.uid() = user_id);

-- orders: owner may read own ledger and append. NO update/delete policy exists,
-- so the ledger is immutable to clients (append-only audit trail).
drop policy if exists orders_select_own on public.orders;
create policy orders_select_own on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own on public.orders
  for insert with check (auth.uid() = user_id);

-- ============================================================================
-- Signup trigger — provision a seeded account for every new auth user.
-- SECURITY DEFINER so it can insert into public.accounts during signup.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.accounts (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- apply_trade — the atomic, idempotent, race-safe write path.
--
-- The Next.js server action does all money math in lib/money using a
-- SERVER-FETCHED authoritative price, then calls this with the resulting
-- absolute integers plus the EXPECTED current values it computed from. This
-- function (SECURITY INVOKER → runs under the caller's RLS + auth.uid()):
--   1. fast-path: if the idempotency key already exists, return 'duplicate'
--      with no writes;
--   2. locks the account + holding rows (FOR UPDATE) and does optimistic
--      concurrency: if current values differ from what the action computed
--      from, raise 'conflict' (the action re-reads and retries);
--   3. applies cash + holding writes, deleting the holding when qty hits 0;
--   4. appends the order; if a concurrent duplicate won the unique race, raise
--      'duplicate' so our writes roll back (never double-apply).
-- DB CHECK constraints guarantee no path can leave cash or qty negative.
-- ============================================================================
create or replace function public.apply_trade(
  p_symbol          text,
  p_side            text,
  p_qty_micro       bigint,
  p_price_kobo      bigint,
  p_total_kobo      bigint,
  p_idempotency_key text,
  p_expected_cash   bigint,
  p_new_cash        bigint,
  p_expected_qty    bigint,
  p_expected_basis  bigint,
  p_new_qty         bigint,
  p_new_basis       bigint
)
returns table (order_id uuid, status text)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_cash   bigint;
  v_qty    bigint;
  v_basis  bigint;
  v_order  uuid;
  v_existing uuid;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  -- (1) idempotency fast-path — already executed, return without writing.
  select id into v_existing from public.orders
   where user_id = v_uid and idempotency_key = p_idempotency_key;
  if v_existing is not null then
    return query select v_existing, 'duplicate'::text;
    return;
  end if;

  -- (2) lock + optimistic-concurrency checks.
  select cash_kobo into v_cash from public.accounts
   where user_id = v_uid for update;
  if not found then
    raise exception 'no_account' using errcode = 'P0002';
  end if;
  if v_cash is distinct from p_expected_cash then
    raise exception 'conflict' using errcode = 'P0001';
  end if;

  select qty_micro, cost_basis_kobo into v_qty, v_basis
    from public.holdings
   where user_id = v_uid and symbol = p_symbol for update;
  v_qty   := coalesce(v_qty, 0);
  v_basis := coalesce(v_basis, 0);
  if v_qty is distinct from p_expected_qty or v_basis is distinct from p_expected_basis then
    raise exception 'conflict' using errcode = 'P0001';
  end if;

  -- (3) apply account + holding writes (CHECK constraints guard invariants).
  update public.accounts
     set cash_kobo = p_new_cash, updated_at = now()
   where user_id = v_uid;

  if p_new_qty = 0 then
    delete from public.holdings where user_id = v_uid and symbol = p_symbol;
  else
    insert into public.holdings (user_id, symbol, qty_micro, cost_basis_kobo, updated_at)
    values (v_uid, p_symbol, p_new_qty, p_new_basis, now())
    on conflict (user_id, symbol)
      do update set qty_micro = excluded.qty_micro,
                    cost_basis_kobo = excluded.cost_basis_kobo,
                    updated_at = now();
  end if;

  -- (4) append the ledger row; concurrent duplicate → roll everything back.
  insert into public.orders
    (user_id, symbol, side, qty_micro, price_kobo, total_kobo, idempotency_key)
  values
    (v_uid, p_symbol, p_side, p_qty_micro, p_price_kobo, p_total_kobo, p_idempotency_key)
  on conflict (user_id, idempotency_key) do nothing
  returning id into v_order;

  if v_order is null then
    raise exception 'duplicate' using errcode = 'P0001';
  end if;

  return query select v_order, 'applied'::text;
end;
$$;

-- ============================================================================
-- reset_account — user-initiated: wipe own holdings + ledger, reseed cash.
-- delete_account_data — user-initiated: remove all of the user's own rows.
-- Both SECURITY DEFINER (so they may delete owner ledger rows that RLS blocks
-- for normal clients) but HARD-SCOPED to auth.uid(); they can never touch
-- another user's data.
-- ============================================================================
create or replace function public.reset_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;
  delete from public.holdings where user_id = v_uid;
  delete from public.orders   where user_id = v_uid;
  update public.accounts set cash_kobo = 500000000, updated_at = now()
   where user_id = v_uid;
end;
$$;

create or replace function public.delete_account_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;
  delete from public.holdings where user_id = v_uid;
  delete from public.orders   where user_id = v_uid;
  delete from public.accounts where user_id = v_uid;
end;
$$;

-- ============================================================================
-- Realtime — publish the three tables so the client can sync holdings/cash/
-- ledger across tabs. Realtime still enforces RLS, so a subscriber only ever
-- receives change events for rows they are allowed to read (their own).
-- ============================================================================
alter publication supabase_realtime add table public.accounts;
alter publication supabase_realtime add table public.holdings;
alter publication supabase_realtime add table public.orders;

-- Lock down function execution to authenticated users only.
revoke all on function public.apply_trade(text,text,bigint,bigint,bigint,text,bigint,bigint,bigint,bigint,bigint,bigint) from public;
grant execute on function public.apply_trade(text,text,bigint,bigint,bigint,text,bigint,bigint,bigint,bigint,bigint,bigint) to authenticated;
revoke all on function public.reset_account() from public;
grant execute on function public.reset_account() to authenticated;
revoke all on function public.delete_account_data() from public;
grant execute on function public.delete_account_data() to authenticated;
