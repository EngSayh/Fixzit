import { test, expect } from "@playwright/test";
import {
  setLocaleToArabic,
  ADMIN_STATE_PATH,
  hasAdminState,
} from "./utils/rtl-helpers";

test.describe("RTL dashboard finance smoke", () => {
  test.skip(
    !hasAdminState,
    `Admin auth state missing at ${ADMIN_STATE_PATH}. Run "pnpm exec playwright test tests/setup-auth.ts".`,
  );
  test.use({ storageState: ADMIN_STATE_PATH });

  test("finance dashboard renders Arabic heading and counters", async ({
    page,
  }) => {
    await page.route("**/api/counters", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          invoices: { total: 20, unpaid: 5, overdue: 2, paid: 13 },
          revenue: { today: 1000, week: 7000, month: 28000, growth: 12 },
        }),
      }),
    );

    await page.goto("/dashboard/finance");
    await setLocaleToArabic(page);
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    const pageHeading = page.getByRole("heading", { level: 1 });
    await expect(pageHeading).toBeVisible({ timeout: 45000 });
    await expect(pageHeading).toHaveText(/المالية/);
    await expect(page.locator("text=إجمالي الفواتير")).toBeVisible();

    const dir = await page.evaluate(() =>
      document.documentElement.getAttribute("dir"),
    );
    expect(dir).toBe("rtl");
  });
});
