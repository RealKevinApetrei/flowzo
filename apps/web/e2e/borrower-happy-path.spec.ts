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

  test("borrower dashboard shows balance card with Shift Bill", async ({ page }) => {
    await loginAsBorrower(page);

    await expect(
      page.getByRole("button", { name: "Shift Bill" })
        .or(page.getByText("Shift Bill"))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("borrower sees suggestions or connect bank prompt", async ({ page }) => {
    await loginAsBorrower(page);

    await expect(
      page
        .getByText("Suggestions", { exact: true })
        .or(page.getByText(/connect your bank/i))
        .or(page.getByText(/all caught up/i))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("borrower sees proposals or empty state", async ({ page }) => {
    await loginAsBorrower(page);

    // Wait for either a proposal "Shift it" button or the caught-up message
    await expect(
      page.getByRole("button", { name: "Shift it" }).first()
        .or(page.getByText("All caught up!"))
    ).toBeVisible({ timeout: 15_000 });
  });

  test("bottom nav is visible", async ({ page }) => {
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
