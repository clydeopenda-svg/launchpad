import type { NextConfig } from "next";

// Baseline security headers for every response. A Content-Security-Policy is
// left out for now: Next.js injects inline scripts, so a strict CSP needs
// per-request nonces, which is a bigger change than these headers.
const securityHeaders = [
  // Stop browsers guessing content types (e.g. running an upload as a script).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Staff pages must not be embedded in other sites (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Don't leak full URLs (which may include search terms) to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app never needs these browser features.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework in an X-Powered-By header.
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
