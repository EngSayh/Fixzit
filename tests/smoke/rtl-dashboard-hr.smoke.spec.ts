import { test, expect } from "@playwright/test";
import {
  setLocaleToArabic,
  ADMIN_STATE_PATH,
  hasAdminState,
} from "./utils/rtl-helpers";

test.describe("RTL dashboard HR smoke", () => {
  test.use({ storageState: ADMIN_STATE_PATH });

  test("dashboard tiles render in Arabic and dir=rtl", async ({ page }) => {
    await page.route("**/api/counters", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          employees: { total: 10, active: 9, on_leave: 1 },
          attendance: { present: 7, absent: 2, late: 1 },
        }),
      }),
    );

    await page.goto("/dashboard/hr");
    await setLocaleToArabic(page);
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Use exact: true to match only the main h1 heading, not the section h2 "إدارة الموارد البشرية"
    await expect(
      page.getByRole("heading", { name: "الموارد البشرية", exact: true }),
    ).toBeVisible({ timeout: 45000 });
    await expect(page.locator("text=إجمالي الموظفين")).toBeVisible();

    const dir = await page.evaluate(() =>
      document.documentElement.getAttribute("dir"),
    );
    expect(dir).toBe("rtl");
  });
});
