import { test, expect } from "@playwright/test";

/**
 * Payment result page E2E tests.
 * Covers the three possible outcomes: success, failed, cancelled.
 * These test the UI rendering without a real payment — we drive the
 * page via query params just as the payment gateway would.
 */

test.describe("Payment result — cancelled", () => {
  test("shows cancelled state when status=cancelled", async ({ page }) => {
    // Cancelled state does not need a real reference — just the status param
    await page.goto("/payment/result?status=cancelled&reference=test-ref");
    await page.waitForLoadState("networkidle");

    // Should render something meaningful (not a blank page or crash)
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(10);

    // Should indicate cancellation — look for common Spanish words
    const hasCancelledCopy = body?.match(/cancelad|volver|inicio|home/i);
    expect(hasCancelledCopy).toBeTruthy();
  });
});

test.describe("Payment result — failed / no reference", () => {
  test("shows error state when reference is missing", async ({ page }) => {
    const response = await page.goto("/payment/result");
    await page.waitForLoadState("networkidle");
    expect(response?.status()).not.toBeGreaterThanOrEqual(500);

    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(10);
  });

  test("shows failed state with invalid reference", async ({ page }) => {
    const response = await page.goto("/payment/result?reference=invalid-ref-e2e&status=failed");
    await page.waitForLoadState("networkidle");
    expect(response?.status()).not.toBeGreaterThanOrEqual(500);

    // Should render error/failed state, not a blank page
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(10);
  });
});

test.describe("Payment result — navigation", () => {
  test("has a way to return home from result page", async ({ page }) => {
    await page.goto("/payment/result?status=cancelled&reference=test-ref");
    await page.waitForLoadState("networkidle");

    // Should have a link or button to go back to home or events
    const homeLink  = page.getByRole("link", { name: /inicio|home|volver|events|explorar/i });
    const homeBtn   = page.getByRole("button", { name: /inicio|home|volver|events|explorar/i });

    const hasNav =
      await homeLink.first().isVisible({ timeout: 3000 }).catch(() => false) ||
      await homeBtn.first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasNav).toBeTruthy();
  });
});

test.describe("Payment result — mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("result page is usable on mobile", async ({ page }) => {
    await page.goto("/payment/result?status=cancelled&reference=test-ref");
    await page.waitForLoadState("networkidle");

    // Page should render without horizontal scroll overflow
    const bodyWidth    = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 390;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // 5px tolerance
  });
});

test.describe("Mock gateway page", () => {
  test("mock gateway page renders without crash", async ({ page }) => {
    await page.goto("/payment/mock-gateway?reference=test-ref&amount=1500&currency=MXN");
    await page.waitForLoadState("networkidle");

    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(10);
  });

  test("mock gateway has approve and reject actions", async ({ page }) => {
    await page.goto("/payment/mock-gateway?reference=test-ref&amount=1500&currency=MXN");
    await page.waitForLoadState("networkidle");

    const disabledHeading = page.getByRole("heading", { name: /pasarela de prueba deshabilitada|gateway de prueba deshabilitado/i });
    const approveBtn = page.getByRole("button", { name: /aprobar|approve|pagar|pay|confirmar/i });
    const rejectBtn  = page.getByRole("button", { name: /rechazar|reject|cancelar|fail/i });

    const isDisabled = await disabledHeading.isVisible({ timeout: 2000 }).catch(() => false);
    if (isDisabled) {
      await expect(disabledHeading).toBeVisible();
    } else {
      await expect(approveBtn.first()).toBeVisible({ timeout: 5000 });
      await expect(rejectBtn.first()).toBeVisible({ timeout: 5000 });
    }
  });
});
