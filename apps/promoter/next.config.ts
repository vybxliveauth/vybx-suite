import path from "node:path";
import type { NextConfig } from "next";

const repoRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  transpilePackages: ["@vybx/ui"],
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
