import { test, expect } from "@playwright/test";

// Helper: simulate admin login by setting auth cookie/localStorage
// In real scenarios, use a global setup file with saved auth state.
async function loginAsAdmin(page: import("@playwright/test").Page) {
  const email    = process.env.TEST_ADMIN_EMAIL    ?? "admin@test.com";
  const password = process.env.TEST_ADMIN_PASSWORD ?? "password123";
  await page.goto("/login");
  await page.locator("input[type='email'], input[name='email']").first().fill(email);
  await page.locator("input[type='password']").first().fill(password);
  await page.locator("button[type='submit']").click();
  await page.waitForURL(/dashboard|events/, { timeout: 15_000 });
}

test.describe("Admin events page (unauthenticated)", () => {
  test("redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/events");
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("Admin events page (authenticated)", () => {
  test.skip("renders event list with status filter", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/events");
    await expect(page.getByRole("heading", { name: /eventos/i })).toBeVisible();
    // Status filter dropdown
    await expect(page.getByRole("combobox")).toBeVisible();
  });

  test.skip("filter by PENDING shows pending events", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/events");
    await page.getByRole("combobox").selectOption("PENDING");
    await page.waitForTimeout(500);
    // All visible badges should say Pendiente
    const badges = page.locator("[class*='amber']");
    await expect(badges.first()).toBeVisible();
  });

  test.skip("clicking Ver navigates to event detail", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/events");
    const firstVerButton = page.getByRole("link", { name: "Ver" }).first();
    await firstVerButton.click();
    await expect(page).toHaveURL(/\/events\/.+/);
  });

  test.skip("event detail shows approval card for PENDING event", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/events?status=PENDING");
    await page.getByRole("link", { name: "Ver" }).first().click();
    await expect(page).toHaveURL(/\/events\/.+/);
    await expect(page.getByText("Revisión pendiente")).toBeVisible();
    await expect(page.getByRole("button", { name: /aprobar/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /rechazar/i })).toBeVisible();
  });
});

test.describe("Admin revenue-ops (unauthenticated)", () => {
  test("redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/revenue-ops");
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("Admin promoters page (unauthenticated)", () => {
  test("redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/promoters");
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("Admin promoter detail page (unauthenticated)", () => {
  test("redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/promoters/some-promoter-id");
    await expect(page).toHaveURL(/login/);
  });
});
