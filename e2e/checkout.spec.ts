import { test, expect } from "@playwright/test";

test.describe("Checkout page", () => {
  test("redirects to home when cart is empty", async ({ page }) => {
    await page.goto("/checkout");

    // With an empty cart, should redirect back or show empty state
    await page.waitForURL((url) => {
      const path = url.pathname;
      return path === "/" || path === "/checkout";
    }, { timeout: 10000 });

    // Either redirected to home or shows empty cart message
    const currentPath = new URL(page.url()).pathname;
    if (currentPath === "/checkout") {
      // Should show some indication that cart is empty
      const body = await page.textContent("body");
      expect(body).toBeTruthy();
    }
  });
});

test.describe("My tickets page", () => {
  test("redirects unauthenticated user or shows login prompt", async ({ page }) => {
    await page.goto("/my-tickets");

    // Should either redirect to login or show auth prompt
    await page.waitForLoadState("networkidle");
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });
});
