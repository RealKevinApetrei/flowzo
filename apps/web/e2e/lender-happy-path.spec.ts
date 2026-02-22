import { test, expect } from "@playwright/test";
import { loginAsLender } from "./helpers/auth";

test.describe("Lender happy path", () => {
  test("sign in and navigate to lender dashboard", async ({ page }) => {
    await loginAsLender(page);
    expect(page.url()).toContain("/lender");
  });

  test("lending pot card shows available balance", async ({ page }) => {
    await loginAsLender(page);

    await expect(
      page.getByText("Available to lend")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("current APY is displayed", async ({ page }) => {
    await loginAsLender(page);

    await expect(
      page.getByText("Current APY")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("top-up action is available", async ({ page }) => {
    await loginAsLender(page);

    await expect(
      page.getByRole("button", { name: "Top Up" })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("performance section is visible", async ({ page }) => {
    await loginAsLender(page);

    await expect(
      page.getByText("Performance", { exact: true })
        .or(page.getByText("Total yield"))
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("upcoming returns section is shown", async ({ page }) => {
    await loginAsLender(page);

    await expect(
      page.getByText("Upcoming Returns")
        .or(page.getByText(/sample data/i))
    ).toBeVisible({ timeout: 10_000 });
  });
});
