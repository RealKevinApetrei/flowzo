import { test, expect } from "@playwright/test";

test.describe("Auth guards", () => {
  test("unauthenticated /borrower redirects to login", async ({ page }) => {
    await page.goto("/borrower");
    await page.waitForURL("**/login**", { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("unauthenticated /lender redirects to login", async ({ page }) => {
    await page.goto("/lender");
    await page.waitForURL("**/login**", { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("unauthenticated /settings redirects to login", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForURL("**/login**", { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("/data page is accessible without auth", async ({ page }) => {
    await page.goto("/data");
    // /data is a public route — should load without redirect
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    expect(page.url()).toContain("/data");
  });

  test("landing page shows login link when not authenticated", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page
        .getByRole("link", { name: /log in/i })
        .or(page.getByRole("link", { name: /sign in/i }))
        .or(page.getByRole("link", { name: /get started/i }))
    ).toBeVisible({ timeout: 10_000 });
  });
});
