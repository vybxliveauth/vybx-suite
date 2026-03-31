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
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: [
              "@/components/ui/*",
              "!@/components/ui/skeleton",
              "!@/components/ui/VybxLogo",
            ],
            message:
              "Use @vybx/ui for shared UI components. Keep only skeleton and VybxLogo until migration is complete.",
          },
        ],
      },
    ],
  },
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  betaRuleTuning,
  sharedIgnores,
]);
