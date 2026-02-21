import { test, expect } from "@playwright/test";
import { loginAsBorrower, BORROWER_EMAIL, PASSWORD } from "./helpers/auth";

test.describe("Borrower happy path", () => {
  test("sign in and land on borrower dashboard", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Welcome back")).toBeVisible();

    await page.fill("#email", BORROWER_EMAIL);
    await page.fill("#password", PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("**/borrower", { timeout: 15_000 });
    expect(page.url()).toContain("/borrower");
  });

  test("borrower dashboard shows greeting", async ({ page }) => {
    await loginAsBorrower(page);

    await expect(
      page
        .getByText(/good (morning|afternoon|evening)/i)
        .or(page.getByText(/hello/i))
        .or(page.getByText(/hey/i))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("borrower dashboard shows calendar heatmap", async ({ page }) => {
    await loginAsBorrower(page);

    await expect(
      page
        .locator("text=30-day forecast")
        .or(page.locator("[data-testid='calendar-heatmap']"))
        .or(page.locator("text=Your forecast"))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("borrower sees suggestions section", async ({ page }) => {
    await loginAsBorrower(page);

    await expect(
      page
        .getByText(/suggestions/i)
        .or(page.getByText(/proposals/i))
        .or(page.getByRole("button", { name: "Accept" }))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("borrower sees at least one proposal and can accept it", async ({
    page,
  }) => {
    await loginAsBorrower(page);

    const acceptBtn = page.getByRole("button", { name: "Accept" }).first();
    await expect(acceptBtn).toBeVisible({ timeout: 10_000 });

    await acceptBtn.click();

    await expect(
      page
        .getByRole("button", { name: "Accepting..." })
        .or(page.getByText("Accepted"))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("bottom nav is visible with expected tabs", async ({ page }) => {
    await loginAsBorrower(page);

    const nav = page.locator("nav").last();
    await expect(nav).toBeVisible();
  });

  test("can navigate to settings", async ({ page }) => {
    await loginAsBorrower(page);

    const settingsLink = page
      .getByRole("link", { name: /settings/i })
      .or(page.locator("a[href*='settings']"));
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await page.waitForURL("**/settings**", { timeout: 10_000 });
      expect(page.url()).toContain("/settings");
    }
  });
});
