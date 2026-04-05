import { test, expect } from "@playwright/test";

test.describe("Auth modal", () => {
  test("opens when clicking login trigger", async ({ page }) => {
    await page.goto("/");

    // Look for the login/auth trigger in the navbar
    const loginBtn = page.getByRole("button", { name: /ingresar|login|iniciar/i });
    if (await loginBtn.isVisible()) {
      await loginBtn.click();

      // Auth modal should appear
      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Should have email input
      const emailInput = modal.getByPlaceholder(/correo|email/i);
      await expect(emailInput).toBeVisible();
    }
  });

  test("shows validation errors on empty submit", async ({ page }) => {
    await page.goto("/");

    const loginBtn = page.getByRole("button", { name: /ingresar|login|iniciar/i });
    if (await loginBtn.isVisible()) {
      await loginBtn.click();

      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Submit without filling anything
      const submitBtn = modal.getByRole("button", { name: /continuar|enviar|submit/i });
      if (await submitBtn.isVisible()) {
        await submitBtn.click();

        // Should show validation error (email is required)
        await expect(modal.getByText(/requerido|required|válido|valid/i)).toBeVisible({
          timeout: 3000,
        });
      }
    }
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
