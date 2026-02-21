import { test, expect } from "@playwright/test";
import { loginAsLender } from "./helpers/auth";

test.describe("Lender happy path", () => {
  test("sign in and land on lender dashboard", async ({ page }) => {
    await loginAsLender(page);
    expect(page.url()).toContain("/lender");
  });

  test("lending pot card is visible with balance", async ({ page }) => {
    await loginAsLender(page);

    await expect(
      page
        .getByText(/lending pot/i)
        .or(page.getByText(/available/i))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("current APY is displayed", async ({ page }) => {
    await loginAsLender(page);

    await expect(
      page
        .getByText(/current apy/i)
        .or(page.getByText(/APY/i))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("top-up action is available", async ({ page }) => {
    await loginAsLender(page);

    await expect(
      page
        .getByRole("button", { name: /top.?up/i })
        .or(page.getByText(/top.?up/i))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("yield stats section is visible", async ({ page }) => {
    await loginAsLender(page);

    await expect(
      page
        .getByText(/yield/i)
        .or(page.getByText(/performance/i))
        .or(page.getByText(/earned/i))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("active trades count is shown", async ({ page }) => {
    await loginAsLender(page);

    await expect(
      page
        .getByText(/active/i)
        .or(page.getByText(/trades/i))
        .or(page.getByText(/deployed/i))
    ).toBeVisible({ timeout: 10_000 });
  });
});
