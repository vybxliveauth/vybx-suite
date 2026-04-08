import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const betaRuleTuning = {
  rules: {
    // Temporary tuning for beta migration; we'll re-enable incrementally.
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/immutability": "off",
    "react-hooks/purity": "warn",
    "react-hooks/incompatible-library": "warn",
    "@next/next/no-html-link-for-pages": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-empty-object-type": "warn",
  },
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  betaRuleTuning,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);
