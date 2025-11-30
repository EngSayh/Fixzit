import { test } from "@playwright/test";
import { assertNoConsoleErrors } from "../helpers/console";

test("Finance HFV - Invoice post", async ({ page }) => {
  await assertNoConsoleErrors(page, async () => {
    // Stub finance APIs to avoid 401/403 in offline mode
    await page.route("**/api/finance/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      }),
    );

    await page.goto("/finance", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "artifacts/finance-before.png" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "artifacts/finance-after.png" });
  });
});
