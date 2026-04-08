import { test, expect, type Page } from "@playwright/test";

/**
 * Navigation and shell E2E tests.
 * Covers navbar, footer, mobile menu, auth modal gate, and
 * key static pages that must always load.
 */

async function openAuthModal(page: Page) {
  const desktopLoginBtn = page.locator("button.nav-auth-btn");
  if (await desktopLoginBtn.isVisible().catch(() => false)) {
    await desktopLoginBtn.click();
  } else {
    const menuBtn = page.getByLabel(/abrir menú|open menu|menú/i);
    await expect(menuBtn).toBeVisible({ timeout: 5000 });
    await menuBtn.click();

    const drawer = page.getByLabel(/menú de navegación/i);
    await expect(drawer).toBeVisible({ timeout: 5000 });
    await drawer.getByRole("button", { name: /^ingresar$/i }).click();
  }

  const modal = page.getByRole("dialog", { name: /autenticación/i });
  await expect(modal).toBeVisible({ timeout: 5000 });
  return modal;
}

test.describe("Navbar", () => {
  test("logo links to home", async ({ page }) => {
    await page.goto("/privacidad");
    await page.waitForLoadState("networkidle");

    const logo = page.locator("a[href='/']").first();
    await expect(logo).toBeVisible({ timeout: 5000 });
    await logo.click();
    await expect(page).toHaveURL("/");
  });

  test("auth button opens modal", async ({ page }) => {
    await page.goto("/");
    const modal = await openAuthModal(page);

    const emailInput = modal.getByRole("textbox").first();
    await expect(emailInput).toBeVisible();
  });

  test("auth modal closes with Escape", async ({ page }) => {
    await page.goto("/");
    const modal = await openAuthModal(page);

    await page.keyboard.press("Escape");
    await expect(modal).toHaveCSS("opacity", "0");
    await expect(modal).toHaveCSS("pointer-events", "none");
  });
});

test.describe("Navbar — mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("mobile menu button opens drawer/menu", async ({ page }) => {
    await page.goto("/");

    const menuBtn = page.getByLabel(/abrir menú|open menu|menú/i);
    await expect(menuBtn).toBeVisible({ timeout: 5000 });
    await menuBtn.click();
    const drawer = page.getByLabel(/menú de navegación/i);
    await expect(drawer).toBeVisible({ timeout: 5000 });
    await expect(drawer.getByRole("button", { name: /^ingresar$/i })).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Static pages", () => {
  test("privacy page fully loads", async ({ page }) => {
    await page.goto("/privacidad");
    await page.waitForLoadState("networkidle");

    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("terms page fully loads", async ({ page }) => {
    await page.goto("/terminos");
    await page.waitForLoadState("networkidle");

    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("forgot password page loads", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.waitForLoadState("networkidle");

    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(10);
  });
});

test.describe("404 handling", () => {
  test("non-existent page shows 404 or redirects gracefully", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-e2e-test");
    // Should return 404 or redirect — not a 5xx server error
    expect(response?.status()).not.toBeGreaterThanOrEqual(500);
  });

  test("non-existent event slug shows 404 or not-found state", async ({ page }) => {
    const response = await page.goto("/events/this-event-does-not-exist-e2e-test-slug");
    expect(response?.status()).not.toBeGreaterThanOrEqual(500);
  });
});

test.describe("SEO & accessibility basics", () => {
  test("home page has a title tag", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("privacy page has a title tag", async ({ page }) => {
    await page.goto("/privacidad");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("home page has lang attribute on html element", async ({ page }) => {
    await page.goto("/");
    const lang = await page.getAttribute("html", "lang");
    expect(lang).toBeTruthy();
  });
});
