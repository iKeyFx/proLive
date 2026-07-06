/**
 * Seed script — provisions a demo user with a few holdings so screenshots and
 * first-run demos look alive. Run AFTER applying supabase/migrations/0001_init.sql.
 *
 *   npm run seed
 *   (uses node --env-file=.env.local; needs SUPABASE_SERVICE_ROLE_KEY)
 *
 * Service-role is used here because seeding crosses the signup trigger and writes
 * directly to a user's rows. This is the ONLY non-request use of the service key.
 */
import { createClient } from "@supabase/supabase-js";
import { INSTRUMENTS } from "../lib/instruments";
import { tradeCost, kobo, qtyMicro, unitsToMicro } from "../lib/money";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_EMAIL = process.env.SEED_EMAIL ?? "demo@prolive.test";
const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? "prolive-demo-1234";
const SEED_CASH = 500_000_000; // ₦5,000,000.00

if (!url || !serviceKey || serviceKey.startsWith("placeholder")) {
  console.error(
    "Missing real NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Fill .env.local first.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findOrCreateUser(): Promise<string> {
  const { data: created, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (created?.user) return created.user.id;

  // Already exists — page through users to find it.
  if (error && !/already/i.test(error.message)) throw error;
  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const found = data.users.find((u) => u.email === DEMO_EMAIL);
    if (found) return found.id;
    if (data.users.length < 200) break;
  }
  throw new Error("Could not create or locate the demo user.");
}

async function main() {
  const userId = await findOrCreateUser();
  console.log(`[seed] demo user: ${DEMO_EMAIL} (${userId})`);

  // Two sample positions.
  const picks = [
    { inst: INSTRUMENTS[0]!, units: 12 }, // DANG
    { inst: INSTRUMENTS[1]!, units: 80 }, // GTCO
  ];

  let spent = 0;
  const holdings = picks.map(({ inst, units }) => {
    const qty = unitsToMicro(units);
    const cost = tradeCost(kobo(inst.seedPrice), qty);
    spent += cost;
    return {
      user_id: userId,
      symbol: inst.symbol,
      qty_micro: qty as number,
      cost_basis_kobo: cost as number,
    };
  });

  // Reset to a clean seeded state for this user.
  await admin.from("orders").delete().eq("user_id", userId);
  await admin.from("holdings").delete().eq("user_id", userId);

  await admin
    .from("accounts")
    .upsert({ user_id: userId, cash_kobo: SEED_CASH - spent }, { onConflict: "user_id" });

  await admin.from("holdings").upsert(holdings, { onConflict: "user_id,symbol" });

  const now = Date.now();
  const orders = picks.map(({ inst, units }, i) => {
    const qty = unitsToMicro(units);
    const total = tradeCost(kobo(inst.seedPrice), qty);
    return {
      user_id: userId,
      symbol: inst.symbol,
      side: "buy" as const,
      qty_micro: qty as number,
      price_kobo: inst.seedPrice as number,
      total_kobo: total as number,
      idempotency_key: `seed-${userId}-${i}`,
      created_at: new Date(now - (picks.length - i) * 60_000).toISOString(),
    };
  });
  await admin.from("orders").insert(orders);

  console.log(`[seed] seeded ${holdings.length} holdings, cash ₦${((SEED_CASH - spent) / 100).toLocaleString()}`);
  console.log(`[seed] sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main().catch((e) => {
  console.error("[seed] failed:", e);
  process.exit(1);
});
