import type { NextConfig } from "next";

// Baseline security headers for every response: no framing (clickjacking on
// delete/admin buttons), no MIME sniffing, no full URLs leaking to other
// sites, HTTPS only, and no access to camera/microphone/location.
//
// Content-Security-Policy without nonces (the variant from the Next.js CSP
// guide): nonces would force every page into dynamic rendering. Inline
// scripts stay allowed for Next's bootstrap and the next-themes snippet;
// everything else is limited to this site and the Supabase project (API,
// realtime, signed screenshot URLs) plus Google Fonts, which globals.css
// imports.
const isDev = process.env.NODE_ENV === "development";
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    // Missing at build time: allow any Supabase project rather than
    // blocking the app's own database connection.
    return "https://*.supabase.co";
  }
})();
const supabaseWs = supabaseOrigin.replace(/^https:/, "wss:");
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' blob: data: ${supabaseOrigin}`,
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs}${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // In dev a local Supabase runs on plain http.
  isDev ? "" : "upgrade-insecure-requests",
]
  .filter(Boolean)
  .map((d) => d.trim())
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
