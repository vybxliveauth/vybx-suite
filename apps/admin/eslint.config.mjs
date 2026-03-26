import { defineConfig, globalIgnores } from "eslint/config";
import nextPluginImport from "@next/eslint-plugin-next";

const plugin =
  nextPluginImport?.flatConfig
    ? nextPluginImport
    : nextPluginImport?.default?.flatConfig
      ? nextPluginImport.default
      : nextPluginImport?.["module.exports"]?.flatConfig
        ? nextPluginImport["module.exports"]
        : null;

if (!plugin?.flatConfig) {
  throw new Error("Could not resolve @next/eslint-plugin-next flatConfig");
}

export default defineConfig([
  plugin.flatConfig.recommended,
  plugin.flatConfig.coreWebVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);
