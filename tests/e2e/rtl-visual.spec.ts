import { expect, test } from "@playwright/test";

test.describe("RTL visual regression", () => {
  test("renders RTL dashboard snapshot", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/qa/rtl-preview");
    await page.waitForLoadState("networkidle");

    const container = page.locator("[data-testid='rtl-preview']");
    await expect(container).toBeVisible();
    const dir = await container.getAttribute("dir");
    expect(dir).toBe("rtl");

    await expect(page).toHaveScreenshot("rtl-preview.png", {
      fullPage: true,
      animations: "disabled",
    });
  });
});
