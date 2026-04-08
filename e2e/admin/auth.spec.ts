import { test, expect } from "@playwright/test";

const ADMIN_EMAIL    = process.env.TEST_ADMIN_EMAIL    ?? "admin@test.com";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "password123";

// ── Login page ────────────────────────────────────────────────────────────────

test.describe("Admin auth", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/login/);
    await expect(page.locator("input[type='email'], input[name='email']").first()).toBeVisible();
    await expect(page.locator("input[type='password']").first()).toBeVisible();
  });

  test("unauthenticated redirect to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  });

  test("unauthenticated redirect from events page", async ({ page }) => {
    await page.goto("/events");
    await expect(page).toHaveURL(/login/);
  });

  test("unauthenticated redirect from revenue-ops", async ({ page }) => {
    await page.goto("/revenue-ops");
    await expect(page).toHaveURL(/login/);
  });

  test("invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.locator("input[type='email'], input[name='email']").first().fill("wrong@test.com");
    await page.locator("input[type='password']").first().fill("wrongpassword");
    await page.locator("button[type='submit']").click();
    // Should stay on login or show error
    await expect(page).toHaveURL(/login/);
  });

  test.skip("login with valid credentials redirects to dashboard", async ({ page }) => {
    // Requires live backend — run with TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD
    await page.goto("/login");
    await page.locator("input[type='email'], input[name='email']").first().fill(ADMIN_EMAIL);
    await page.locator("input[type='password']").first().fill(ADMIN_PASSWORD);
    await page.locator("button[type='submit']").click();
    await page.waitForURL(/dashboard/, { timeout: 15_000 });
    await expect(page).toHaveURL(/dashboard/);
  });
});
