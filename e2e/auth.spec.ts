import { test, expect, type Page } from "@playwright/test";

async function openAuthModal(page: Page) {
  const desktopLoginBtn = page.locator("button.nav-auth-btn");
  if (await desktopLoginBtn.isVisible().catch(() => false)) {
    await desktopLoginBtn.click();
  } else {
    const menuBtn = page.getByLabel(/abrir menú/i);
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

test.describe("Auth modal", () => {
  test("opens when clicking login trigger", async ({ page }) => {
    await page.goto("/");
    const modal = await openAuthModal(page);
    await expect(modal.getByPlaceholder(/correo|email/i)).toBeVisible();
  });

  test("shows validation errors on empty submit", async ({ page }) => {
    await page.goto("/");
    const modal = await openAuthModal(page);

    const submitBtn = modal.getByRole("button", { name: /continuar|enviar|submit/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    const emailError = modal.locator("span").filter({ hasText: /email inválido|required/i }).first();
    await expect(emailError).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Static pages", () => {
  test("privacy page loads", async ({ page }) => {
    await page.goto("/privacidad");
    await expect(page.locator("main, #main-content, [role='main']").first()).toBeVisible();
  });

  test("terms page loads", async ({ page }) => {
    await page.goto("/terminos");
    await expect(page.locator("main, #main-content, [role='main']").first()).toBeVisible();
  });

  test("forgot password page loads", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator("main, #main-content, [role='main']").first()).toBeVisible();
  });
});
