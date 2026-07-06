import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 *
 * The Content-Security-Policy is intentionally strict. `connect-src` allows the
 * Supabase project origin and the local price-simulator WebSocket; nothing else
 * may open a socket or fetch. We self-host fonts (next/font) so no font CDN is
 * whitelisted. `frame-ancestors 'none'` + X-Frame-Options block clickjacking.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const FEED_WS = process.env.NEXT_PUBLIC_FEED_WS_URL ?? "ws://localhost:4001";

// Derive ws(s) origins so realtime + simulator sockets are permitted.
const supabaseWs = SUPABASE_URL ? SUPABASE_URL.replace(/^http/, "ws") : "";

const csp = [
  "default-src 'self'",
  // Next.js requires 'unsafe-inline' for its inline bootstrap in dev; in prod
  // it is nonce-based, but we keep a conservative allowance for styled-jsx.
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${SUPABASE_URL} ${supabaseWs} ${FEED_WS}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
