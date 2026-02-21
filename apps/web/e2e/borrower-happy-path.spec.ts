import { test, expect } from "@playwright/test";

const BORROWER_EMAIL = "borrower-001@flowzo-demo.test";
const BORROWER_PASSWORD = "FlowzoDemo2026!";

test.describe("Borrower happy path", () => {
  test("sign in and land on borrower dashboard", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Welcome back")).toBeVisible();

    await page.fill("#email", BORROWER_EMAIL);
    await page.fill("#password", BORROWER_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("**/borrower", { timeout: 15_000 });
    expect(page.url()).toContain("/borrower");
  });

  test("borrower dashboard shows calendar heatmap", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", BORROWER_EMAIL);
    await page.fill("#password", BORROWER_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/borrower", { timeout: 15_000 });

    // Calendar heatmap renders a grid of day cells
    await expect(page.locator("text=30-day forecast").or(page.locator("[data-testid='calendar-heatmap']")).or(page.locator("text=Your forecast"))).toBeVisible({ timeout: 10_000 });
  });

  test("borrower sees at least one proposal and can accept it", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", BORROWER_EMAIL);
    await page.fill("#password", BORROWER_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/borrower", { timeout: 15_000 });

    // Wait for suggestion feed to load and show an Accept button
    const acceptBtn = page.getByRole("button", { name: "Accept" }).first();
    await expect(acceptBtn).toBeVisible({ timeout: 10_000 });

    await acceptBtn.click();

    // After accepting, button should show loading state or disappear
    await expect(
      page.getByRole("button", { name: "Accepting..." }).or(
        page.getByText("Accepted")
      )
    ).toBeVisible({ timeout: 10_000 });
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/borrower");
    await page.waitForURL("**/login**", { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });
});
