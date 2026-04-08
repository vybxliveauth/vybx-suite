import { test, expect } from "@playwright/test";

const PROMOTER_EMAIL    = process.env.TEST_PROMOTER_EMAIL    ?? "promoter@test.com";
const PROMOTER_PASSWORD = process.env.TEST_PROMOTER_PASSWORD ?? "password123";

test.describe("Promoter auth", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/login/);
    await expect(page.locator("input[type='email'], input[name='email']").first()).toBeVisible();
    await expect(page.locator("input[type='password']").first()).toBeVisible();
  });

  test("unauthenticated redirect to login from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  });

  test("unauthenticated redirect to login from events", async ({ page }) => {
    await page.goto("/events");
    await expect(page).toHaveURL(/login/);
  });

  test("unauthenticated redirect to login from sales", async ({ page }) => {
    await page.goto("/sales");
    await expect(page).toHaveURL(/login/);
  });

  test("unauthenticated redirect to login from refunds", async ({ page }) => {
    await page.goto("/refunds");
    await expect(page).toHaveURL(/login/);
  });

  test("unauthenticated redirect to login from settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/login/);
  });

  test("invalid credentials stays on login page", async ({ page }) => {
    await page.goto("/login");
    await page.locator("input[type='email'], input[name='email']").first().fill("bad@bad.com");
    await page.locator("input[type='password']").first().fill("badpass");
    await page.locator("button[type='submit']").click();
    await expect(page).toHaveURL(/login/);
  });

  test.skip("valid credentials redirect to dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.locator("input[type='email'], input[name='email']").first().fill(PROMOTER_EMAIL);
    await page.locator("input[type='password']").first().fill(PROMOTER_PASSWORD);
    await page.locator("button[type='submit']").click();
    await page.waitForURL(/dashboard/, { timeout: 15_000 });
    await expect(page).toHaveURL(/dashboard/);
  });
});
