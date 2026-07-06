import "server-only";

/**
 * Minimal in-memory sliding-window rate limiter. Adequate for a single-instance
 * demo; in a multi-instance deployment swap the Map for Redis/Upstash (same
 * interface). Used to blunt auth brute-force and order-submission abuse.
 */
interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * @param key    stable identity, e.g. `auth:<ip>` or `order:<userId>`
 * @param limit  max actions per window
 * @param windowMs  window length in ms
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, retryAfterMs: 0 };
}

// Opportunistic cleanup so the Map can't grow unbounded over a long-lived server.
let lastSweep = Date.now();
export function sweepExpired(): void {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, w] of buckets) {
    if (now >= w.resetAt) buckets.delete(key);
  }
}
