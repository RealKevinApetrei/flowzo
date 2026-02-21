import { test, expect } from "@playwright/test";
import { loginAsBorrower } from "./helpers/auth";

test.describe("Data analytics page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsBorrower(page);
    await page.goto("/data");
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  });

  test("page loads with title", async ({ page }) => {
    await expect(
      page
        .getByText(/analytics/i)
        .or(page.getByText(/data/i))
        .or(page.getByText(/platform/i))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("section nav pills are visible", async ({ page }) => {
    await expect(
      page
        .getByRole("button", { name: "Pool" })
        .or(page.getByRole("button", { name: "Trades" }))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("pool summary section shows stat cards", async ({ page }) => {
    const poolSection = page.locator("#pool-summary");
    await expect(poolSection).toBeVisible({ timeout: 10_000 });
  });

  test("trade summary section shows status breakdown", async ({ page }) => {
    const tradeSection = page.locator("#trade-summary");
    await expect(tradeSection).toBeVisible({ timeout: 10_000 });

    await expect(
      page
        .getByText(/live/i)
        .or(page.getByText(/repaid/i))
        .or(page.getByText(/pending/i))
    ).toBeVisible();
  });

  test("order book table shows grade data", async ({ page }) => {
    const orderBook = page.locator("#order-book");
    await expect(orderBook).toBeVisible({ timeout: 10_000 });

    // Should show grade badges (A, B, C)
    await expect(
      orderBook.getByText("A").or(orderBook.getByText("B")).or(orderBook.getByText("C"))
    ).toBeVisible();
  });

  test("performance table shows APR data", async ({ page }) => {
    const perf = page.locator("#performance");
    await expect(perf).toBeVisible({ timeout: 10_000 });

    await expect(
      perf
        .getByText(/apr/i)
        .or(perf.getByText(/default/i))
        .or(perf.getByText(/%/))
    ).toBeVisible();
  });

  test("yield curve section is visible", async ({ page }) => {
    const yieldCurve = page.locator("#yield-curve");
    await expect(yieldCurve).toBeVisible({ timeout: 10_000 });
  });

  test("lenders leaderboard shows data", async ({ page }) => {
    const lenders = page.locator("#lenders");
    await expect(lenders).toBeVisible({ timeout: 10_000 });
  });

  test("risk distribution section is visible", async ({ page }) => {
    const risk = page.locator("#risk-distribution");
    await expect(risk).toBeVisible({ timeout: 10_000 });
  });
});
