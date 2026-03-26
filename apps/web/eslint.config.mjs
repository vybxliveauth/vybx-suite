import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const sharedIgnores = globalIgnores([
  ".next/**",
  "out/**",
  "build/**",
  "next-env.d.ts",
]);

const betaRuleTuning = {
  rules: {
    // Temporary tuning for beta migration; we'll re-enable incrementally.
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/immutability": "off",
    "@next/next/no-html-link-for-pages": "warn",
  },
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  betaRuleTuning,
  sharedIgnores,
]);
