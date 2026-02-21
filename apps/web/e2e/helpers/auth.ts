import type { Page } from "@playwright/test";

export const BORROWER_EMAIL = "borrower-001@flowzo-demo.test";
export const LENDER_EMAIL = "lender-001@flowzo-demo.test";
export const PASSWORD = "FlowzoDemo2026!";

export async function loginAsBorrower(page: Page) {
  await page.goto("/login");
  await page.fill("#email", BORROWER_EMAIL);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/borrower", { timeout: 15_000 });
}

export async function loginAsLender(page: Page) {
  await page.goto("/login");
  await page.fill("#email", LENDER_EMAIL);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/lender", { timeout: 15_000 });
}
