import { test, expect } from "@playwright/test";
import {
  setLocaleToArabic,
  ADMIN_STATE_PATH,
} from "./utils/rtl-helpers";

test.describe("RTL dashboard system smoke", () => {
  test.use({ storageState: ADMIN_STATE_PATH });

  test("system dashboard renders Arabic heading and counters", async ({
    page,
  }) => {
    await page.route("**/api/counters", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          system: { users: 50, roles: 12, tenants: 7 },
        }),
      }),
    );

    await page.goto("/dashboard/system");
    await setLocaleToArabic(page);
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    const pageHeading = page.getByRole("heading", { level: 1 });
    await expect(pageHeading).toBeVisible({ timeout: 45000 });
    await expect(pageHeading).toHaveText(/إدارة النظام/);
    await expect(page.locator("text=إجمالي المستخدمين")).toBeVisible();

    const dir = await page.evaluate(() =>
      document.documentElement.getAttribute("dir"),
    );
    expect(dir).toBe("rtl");
  });
});
