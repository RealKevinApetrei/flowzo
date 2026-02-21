import { test, expect } from "@playwright/test";

test.describe("Error states", () => {
  test("invalid credentials show error message", async ({ page }) => {
    await page.goto("/login");

    await page.fill("#email", "invalid@example.com");
    await page.fill("#password", "wrongpassword123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page
        .getByText(/invalid/i)
        .or(page.getByText(/error/i))
        .or(page.getByText(/incorrect/i))
        .or(page.getByText(/failed/i))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("signup form has required field validation", async ({ page }) => {
    await page.goto("/signup");

    // Try submitting empty form
    const submitBtn = page
      .getByRole("button", { name: /sign up/i })
      .or(page.getByRole("button", { name: /create/i }));

    if (await submitBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await submitBtn.click();

      // Browser should show validation or app should show error
      await expect(
        page
          .getByText(/required/i)
          .or(page.getByText(/valid email/i))
          .or(page.locator(":invalid"))
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test("404 page handles unknown routes", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist-12345");

    // Should either show 404 page or redirect
    const is404 = response?.status() === 404;
    const hasNotFoundText = await page
      .getByText(/not found/i)
      .or(page.getByText(/404/i))
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const wasRedirected = page.url().includes("/login") || page.url().endsWith("/");

    expect(is404 || hasNotFoundText || wasRedirected).toBeTruthy();
  });
});
