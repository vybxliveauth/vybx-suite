import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

const adminRoot = resolve(__dirname, "apps/admin/src");
const adminNodeModules = resolve(__dirname, "apps/admin/node_modules");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@/": adminRoot + "/",
      react: resolve(adminNodeModules, "react"),
      "react-dom": resolve(adminNodeModules, "react-dom"),
      "react/jsx-dev-runtime": resolve(adminNodeModules, "react/jsx-dev-runtime"),
      "react/jsx-runtime": resolve(adminNodeModules, "react/jsx-runtime"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
  },
});
