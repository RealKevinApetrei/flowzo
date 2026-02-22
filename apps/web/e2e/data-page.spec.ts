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
      page.getByRole("heading", { name: "Data & Analytics" })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("tab navigation pills are visible", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Overview" })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("overview tab shows pool stats", async ({ page }) => {
    await expect(
      page.getByText("TOTAL POOL").or(page.getByText("UTILIZATION")).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("overview tab shows trade pipeline", async ({ page }) => {
    await expect(
      page.getByText("Pending", { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("order book tab shows grade data", async ({ page }) => {
    await page.getByRole("button", { name: "Order Book" }).click();
    await page.waitForTimeout(1000);

    await expect(
      page.getByText(/demand/i).or(page.getByText(/supply/i)).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("performance tab shows settlement data", async ({ page }) => {
    await page.getByRole("button", { name: "Performance" }).click();
    await page.waitForTimeout(1000);

    await expect(
      page.getByText("Match Speed").or(page.getByText("Settlement Performance")).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("yield tab is visible", async ({ page }) => {
    await page.getByRole("button", { name: "Yield" }).click();
    await page.waitForTimeout(1000);

    await expect(
      page.getByText("Monthly Yield").or(page.getByText("Yield Trend")).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("revenue tab shows fee data", async ({ page }) => {
    await page.getByRole("button", { name: "Revenue" }).click();
    await page.waitForTimeout(1000);

    await expect(
      page.getByText("FEE INCOME").or(page.getByText("NET REVENUE")).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("lenders tab shows data", async ({ page }) => {
    await page.getByRole("button", { name: "Lenders" }).click();
    await page.waitForTimeout(1000);

    await expect(
      page.getByText("HHI").or(page.getByText("TOP LENDER")).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
