import { defineConfig, devices } from "@playwright/test";

const WEB_PORT    = 3000;
const PROMOTER_PORT = 3001;
const ADMIN_PORT  = 3002;

const WEB_URL      = `http://localhost:${WEB_PORT}`;
const PROMOTER_URL = `http://localhost:${PROMOTER_PORT}`;
const ADMIN_URL    = `http://localhost:${ADMIN_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: "html",
  timeout: 45_000,
  globalTimeout: 15 * 60_000,

  use: {
    baseURL: WEB_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "admin-chromium",
      use: { ...devices["Desktop Chrome"], baseURL: ADMIN_URL },
      testMatch: "**/admin/**/*.spec.ts",
    },
    {
      name: "promoter-chromium",
      use: { ...devices["Desktop Chrome"], baseURL: PROMOTER_URL },
      testMatch: "**/promoter/**/*.spec.ts",
    },
  ],

  webServer: [
    {
      command: "pnpm turbo dev --filter=@vybx/web",
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "pnpm turbo dev --filter=@vybx/promoter",
      url: PROMOTER_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "pnpm turbo dev --filter=@vybx/admin",
      url: ADMIN_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
