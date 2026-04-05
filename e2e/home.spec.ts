import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("renders hero section and events", async ({ page }) => {
    await page.goto("/");

    // Hero content loads
    await expect(page.locator("#main-content")).toBeVisible();

    // Events section is present
    await expect(page.locator("#events")).toBeVisible();
  });

  test("search bar is accessible and functional", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.getByLabel("Buscar artista, evento o lugar");
    await expect(searchInput).toBeVisible();

    // Type a query
    await searchInput.fill("test");
    await searchInput.press("Enter");

    // Page should still be stable (no crash)
    await expect(page.locator("#events")).toBeVisible();
  });

  test("category filter chips are rendered", async ({ page }) => {
    await page.goto("/");

    const toolbar = page.getByRole("toolbar", {
      name: "Filtros por categoría",
    });
    // Desktop only — skip if not visible (mobile)
    if (await toolbar.isVisible()) {
      const buttons = toolbar.getByRole("button");
      await expect(buttons.first()).toBeVisible();
    }
  });

  test("navigation links are present", async ({ page }) => {
    await page.goto("/");

    // Footer or nav should have legal links
    await expect(page.getByRole("link", { name: /privacidad/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /términos/i })).toBeVisible();
  });
});

test.describe("Home page — mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("mobile menu button is visible", async ({ page }) => {
    await page.goto("/");

    const menuButton = page.getByLabel("Abrir menú");
    await expect(menuButton).toBeVisible();
  });

  test("events section scrolls and loads", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#events")).toBeVisible();
  });
});
