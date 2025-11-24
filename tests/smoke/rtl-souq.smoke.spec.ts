import { test, expect } from "@playwright/test";
import { setLocaleToArabic } from "./utils/rtl-helpers";

test.describe("RTL souq smoke", () => {
  test("souq home renders RTL hero", async ({ page }) => {
    await page.goto("/souq");
    await setLocaleToArabic(page);
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("text=سوق فكسزيت")).toBeVisible({
      timeout: 45000,
    });

    const dir = await page.evaluate(() =>
      document.documentElement.getAttribute("dir"),
    );
    expect(dir).toBe("rtl");
  });
});
