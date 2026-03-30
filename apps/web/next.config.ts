import path from "node:path";
import type { NextConfig } from "next";

const repoRoot = path.join(__dirname, "../..");
const isDev = process.env.NODE_ENV !== "production";

// Origins the browser is allowed to connect to from this app.
const connectSrcExtra = isDev
  ? "http://localhost:3004 http://localhost:3004/api/v1 ws://localhost:3000"
  : "";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

const cspDirectives = [
  "default-src 'self'",
  // Next.js requires unsafe-inline + unsafe-eval for its own runtime scripts.
  // Harden further in production by switching to nonce-based CSP in middleware.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data:",
  `connect-src 'self' https://challenges.cloudflare.com ${[apiUrl, connectSrcExtra].filter(Boolean).join(" ")}`.trim(),
  "media-src 'self' blob:",
  "frame-src https://challenges.cloudflare.com",
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
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
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
  transpilePackages: ["@vybx/ui", "@vybx/schemas"],
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.cloudinary.com" },
      ...(isDev ? [{ protocol: "http" as const, hostname: "localhost" }] : []),
    ],
  },
  async headers() {
    return [
      {
        // HTML/doc routes: avoid stale document shells after production deploys.
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
      { source: "/(.*)", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
