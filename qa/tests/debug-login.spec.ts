import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

test.describe("Simple Login Page Test", () => {
  test("should load the login page without errors", async ({ page }) => {
    // Go to login page
    await page.goto(`${BASE_URL}/login`);

    // Wait a bit for hydration
    await page.waitForTimeout(2000);

    // Check if we can at least see the page title
    const title = await page.title();
    console.log("Page title:", title);

    // Take a screenshot for debugging
    await page.screenshot({
      path: "test-results/login-page-loaded.png",
      fullPage: true,
    });

    // Check if the page has any visible text
    const bodyText = await page.textContent("body");
    console.log("Body text length:", bodyText?.length || 0);
    console.log("Body text sample:", bodyText?.substring(0, 200));

    // Try to find any button
    const buttons = await page.locator("button").all();
    console.log("Number of buttons found:", buttons.length);

    // Try to find the test ID we're looking for
    const emailInput = page.locator('[data-testid="login-email"]');
    const isVisible = await emailInput
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    console.log("Email input visible:", isVisible);

    if (!isVisible) {
      // If not visible, let's see what IS on the page
      const pageContent = await page.content();
      console.log(
        "\n📄 Full page HTML (first 1000 chars):\n",
        pageContent.substring(0, 1000),
      );
    }
  });
});
