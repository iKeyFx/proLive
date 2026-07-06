import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 *
 * The Content-Security-Policy is intentionally strict. `connect-src` allows only
 * the Supabase project origin (REST + realtime socket); nothing else may open a
 * socket or fetch. Prices are computed in-process from a deterministic model, so
 * no price feed origin is whitelisted. We self-host fonts (next/font) so no font
 * CDN is needed. `frame-ancestors 'none'` + X-Frame-Options block clickjacking.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Derive the ws(s) origin so the Supabase realtime socket is permitted.
const supabaseWs = SUPABASE_URL ? SUPABASE_URL.replace(/^http/, "ws") : "";

const csp = [
  "default-src 'self'",
  // Next.js requires 'unsafe-inline' for its inline bootstrap in dev; in prod
  // it is nonce-based, but we keep a conservative allowance for styled-jsx.
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${SUPABASE_URL} ${supabaseWs}`.trim(),
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
