import { test, expect } from "@playwright/test";

async function loginAsPromoter(page: import("@playwright/test").Page) {
  const email    = process.env.TEST_PROMOTER_EMAIL    ?? "promoter@test.com";
  const password = process.env.TEST_PROMOTER_PASSWORD ?? "password123";
  await page.goto("/login");
  await page.locator("input[type='email'], input[name='email']").first().fill(email);
  await page.locator("input[type='password']").first().fill(password);
  await page.locator("button[type='submit']").click();
  await page.waitForURL(/dashboard/, { timeout: 15_000 });
}

test.describe("Promoter events list (unauthenticated)", () => {
  test("redirects to login", async ({ page }) => {
    await page.goto("/events");
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("Promoter new event (unauthenticated)", () => {
  test("redirects to login", async ({ page }) => {
    await page.goto("/events/new");
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("Promoter event detail (unauthenticated)", () => {
  test("redirects to login", async ({ page }) => {
    await page.goto("/events/some-event-id");
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("Promoter new event form (authenticated)", () => {
  test.skip("new event page renders form fields", async ({ page }) => {
    await loginAsPromoter(page);
    await page.goto("/events/new");
    await expect(page.getByLabel(/t[íi]tulo/i)).toBeVisible();
    await expect(page.getByLabel(/descripci[óo]n/i)).toBeVisible();
    await expect(page.getByLabel(/fecha/i)).toBeVisible();
    await expect(page.getByLabel(/ubicaci[óo]n/i)).toBeVisible();
  });

  test.skip("empty form shows validation errors on submit", async ({ page }) => {
    await loginAsPromoter(page);
    await page.goto("/events/new");
    await page.getByRole("button", { name: /crear evento/i }).click();
    // Should show at least one error
    await expect(page.locator("[class*='destructive'], [class*='error']").first()).toBeVisible();
  });

  test.skip("add ticket tier button adds a tier row", async ({ page }) => {
    await loginAsPromoter(page);
    await page.goto("/events/new");
    const initialRows = await page.locator("[data-tier-row]").count();
    await page.getByRole("button", { name: /agregar tier|add tier/i }).click();
    expect(await page.locator("[data-tier-row]").count()).toBeGreaterThan(initialRows);
  });
});

test.describe("Promoter sales page (authenticated)", () => {
  test.skip("sales page renders KPI cards and chart", async ({ page }) => {
    await loginAsPromoter(page);
    await page.goto("/sales");
    await expect(page.getByText(/ingresos/i).first()).toBeVisible();
    // Chart container should exist
    await expect(page.locator(".recharts-wrapper, [class*='recharts']").first()).toBeVisible();
  });

  test.skip("event picker dropdown opens and filters", async ({ page }) => {
    await loginAsPromoter(page);
    await page.goto("/sales");
    // Event picker button
    await page.getByText(/todos los eventos/i).click();
    await expect(page.getByText(/vista agregada/i)).toBeVisible();
  });

  test.skip("date range buttons change selection", async ({ page }) => {
    await loginAsPromoter(page);
    await page.goto("/sales");
    const btn90d = page.getByRole("button", { name: "90d" });
    await btn90d.click();
    await expect(btn90d).toHaveClass(/bg-primary/);
  });
});
