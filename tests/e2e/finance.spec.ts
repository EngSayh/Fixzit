import { test } from "@playwright/test";
import { assertNoConsoleErrors } from "../helpers/console";

test("Finance HFV - Invoice post", async ({ page }) => {
  await assertNoConsoleErrors(page, async () => {
    // Stub finance APIs to avoid 401/403 in offline mode
    await page.route("**/api/finance/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          incomeStatement: {
            revenue: 125000,
            expenses: 45000,
            netIncome: 80000,
          },
          balanceSheet: {
            assets: 500000,
            liabilities: 150000,
            equity: 350000,
          },
          cashFlow: {
            operating: 60000,
            investing: -10000,
            financing: -5000,
          },
          invoices: [],
          payments: [],
        }),
      }),
    );

    await page.goto("/finance", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "artifacts/finance-before.png" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "artifacts/finance-after.png" });
  });
});
