import path from "node:path";
import type { NextConfig } from "next";

const repoRoot = path.join(__dirname, "../..");
const isDev = process.env.NODE_ENV !== "production";

const connectSrcExtra = isDev
  ? "http://localhost:3004 http://localhost:3004/api/v1"
  : "";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data:",
  `connect-src 'self' https://challenges.cloudflare.com ${[apiUrl, connectSrcExtra].filter(Boolean).join(" ")}`.trim(),
  "frame-src https://challenges.cloudflare.com",
  "media-src 'self' blob:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      ]),
];

const nextConfig: NextConfig = {
  transpilePackages: ["@vybx/ui"],
  outputFileTracingRoot: repoRoot,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
