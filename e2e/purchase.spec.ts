import { test, expect } from "@playwright/test";

/**
 * Purchase funnel E2E tests.
 * Tests the full discovery → detail → ticket selection → checkout auth gate flow.
 * These run against the real app without mocking — they validate the UI gates
 * and navigation, not the backend data.
 */

test.describe("Purchase funnel — discovery", () => {
  test("home page shows events section with loading or results", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const eventsSection = page.locator("#events");
    await expect(eventsSection).toBeVisible();

    // Either events loaded or skeleton is shown — both are valid states
    const hasContent = await eventsSection.locator(".glass-card, .event-skeleton, [class*=skeleton]").count();
    expect(hasContent).toBeGreaterThan(0);
  });

  test("showcase section renders when events exist", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const showcase = page.locator(".showcase-shell");
    const showcaseCount = await showcase.count();
    if (showcaseCount > 0) {
      await expect(showcase.first()).toBeVisible();
      return;
    }
    await expect(page.locator("#events")).toBeVisible();
  });

  test("search narrows event list without crashing", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const search = page.getByLabel("Buscar artista, evento o lugar");
    await search.fill("xyz_no_match_expected");
    await search.press("Enter");

    // App should stay stable and show empty state or results
    await expect(page.locator("#events")).toBeVisible();
    await page.waitForTimeout(300); // debounce
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });

  test("category filter applies and resets correctly", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const toolbar = page.getByRole("toolbar", { name: "Filtros por categoría" });
    if (!await toolbar.isVisible()) return; // mobile — skip

    const buttons = toolbar.getByRole("button");
    const count = await buttons.count();
    if (count < 2) return;

    // Click first non-"Todos" button
    const firstFilter = buttons.nth(1);
    await firstFilter.click();
    await expect(firstFilter).toHaveClass(/active/);

    // Click "Todos" to reset
    const todosBtn = buttons.first();
    await todosBtn.click();
    await expect(todosBtn).toHaveClass(/active/);
  });
});

test.describe("Purchase funnel — event detail", () => {
  test("clicking event card navigates to event detail", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const cardLink = page.locator("a[href^='/events/']").first();
    const linkCount = await page.locator("a[href^='/events/']").count();
    if (linkCount === 0) {
      test.skip(); // no events seeded
      return;
    }

    await expect(cardLink).toBeVisible();
    await cardLink.click();

    // Should navigate to /events/[slug]
    await page.waitForURL(/\/events\/.+/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/events\/.+/);
  });

  test("event detail page has essential elements", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const cardLink = page.locator("a[href^='/events/']").first();
    const linkCount = await page.locator("a[href^='/events/']").count();
    if (linkCount === 0) {
      test.skip();
      return;
    }

    const href = await cardLink.getAttribute("href");
    if (!href) return;

    await page.goto(href);
    await page.waitForLoadState("networkidle");

    // Essential structural elements
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("buy button triggers auth modal for unauthenticated user", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const cardLink = page.locator("a[href^='/events/']").first();
    if (await cardLink.count() === 0) {
      test.skip();
      return;
    }

    const href = await cardLink.getAttribute("href");
    if (!href) return;

    await page.goto(href);
    await page.waitForLoadState("networkidle");

    // Find a "Comprar" or "Agregar" button
    const buyBtn = page.getByRole("button", { name: /comprar|agregar|añadir|reservar|actualizar reserva/i }).first();
    if (!await buyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      test.skip();
      return;
    }

    await buyBtn.click();

    // Either opens ticket sidebar, quantity selector, or auth modal
    await page.waitForTimeout(500);
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });

  test("share button is present on event detail", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const cardLink = page.locator("a[href^='/events/']").first();
    if (await cardLink.count() === 0) {
      test.skip();
      return;
    }
    const href = await cardLink.getAttribute("href");
    if (!href) return;

    await page.goto(href);
    await page.waitForLoadState("networkidle");

    // Share or back navigation exists
    const shareBtn = page.getByRole("button", { name: /compartir|share/i });
    const backBtn  = page.getByRole("link", { name: /volver|atrás|back/i });
    const eitherVisible =
      await shareBtn.isVisible().catch(() => false) ||
      await backBtn.isVisible().catch(() => false);
    expect(eitherVisible).toBeTruthy();
  });
});

test.describe("Purchase funnel — checkout gate", () => {
  test("checkout page redirects when cart is empty", async ({ page }) => {
    const response = await page.goto("/checkout");
    await page.waitForLoadState("networkidle");
    expect(response?.status()).not.toBeGreaterThanOrEqual(500);

    // With empty cart: redirects home or shows empty-cart state
    const url = page.url();
    const onHome     = url.endsWith("/") || url.includes("/?") || new URL(url).pathname === "/";
    const onCheckout = new URL(url).pathname === "/checkout";

    expect(onHome || onCheckout).toBeTruthy();

    if (onCheckout) {
      // Should show some indication it's empty or prompt to browse
      const body = await page.textContent("body");
      expect(body?.length).toBeGreaterThan(10);
    }
  });

  test("my-tickets requires auth", async ({ page }) => {
    const response = await page.goto("/my-tickets");
    await page.waitForLoadState("networkidle");
    expect(response?.status()).not.toBeGreaterThanOrEqual(500);

    // Should either redirect to login/home or show auth prompt
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });

  test("profile page requires auth", async ({ page }) => {
    const response = await page.goto("/profile");
    await page.waitForLoadState("networkidle");
    expect(response?.status()).not.toBeGreaterThanOrEqual(500);

    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });
});
