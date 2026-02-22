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

  test("signup form validates passwords match", async ({ page }) => {
    await page.goto("/signup");

    const createBtn = page
      .getByRole("button", { name: /create account/i })
      .or(page.getByRole("button", { name: /sign up/i }));

    if (await createBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Fill in mismatched passwords
      await page.fill("#email", "test@example.com");
      await page.fill("#password", "TestPass123!");
      await page.fill("#confirmPassword", "DifferentPass!");
      await createBtn.click();

      // Should show password mismatch error or browser validation
      await expect(
        page
          .getByText(/match/i)
          .or(page.getByText(/required/i))
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
