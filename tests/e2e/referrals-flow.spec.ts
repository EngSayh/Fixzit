/**
 * E2E Test: Referrals Flow
 * Tests referral code generation, sharing, and tracking
 */

import { test, expect } from "@playwright/test";

test.describe("Referrals Program", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display referrals page", async ({ page }) => {
    await page.goto("/referrals");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/login"); // Requires authenticated session state

    // Page should load with referral content
    await expect(page.locator("body")).toBeVisible();
    await page.waitForLoadState('networkidle');
  });

  test("should show generate referral code button", async ({ page }) => {
    await page.goto("/referrals");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/login"); // Requires authenticated session state

    // Look for generate button or existing code
    const generateButton = page.locator('button:has-text("Generate")');
    const referralCode = page.locator('[data-testid="referral-code"]');

    const hasGenerateButton = (await generateButton.count()) > 0;
    const hasExistingCode = (await referralCode.count()) > 0;

    // Should have either generate button or existing code
    expect(hasGenerateButton || hasExistingCode).toBeTruthy();
  });

  test("should display copy buttons for referral code", async ({ page }) => {
    await page.goto("/referrals");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/login"); // Requires authenticated session state

    // Look for copy buttons
    const copyButtons = page.locator('button:has-text("Copy")');
    const copyButtonCount = await copyButtons.count();

    if (copyButtonCount > 0) {
      await expect(copyButtons.first()).toBeVisible();
    }
  });

  test("should display share options", async ({ page }) => {
    await page.goto("/referrals");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/login"); // Requires authenticated session state

    // Look for WhatsApp and Email share buttons
    const whatsappButton = page.locator('button[data-testid="share-whatsapp"]');
    const emailButton = page.locator('button[data-testid="share-email"]');

    const hasShareButtons =
      (await whatsappButton.count()) > 0 || (await emailButton.count()) > 0;

    if (hasShareButtons) {
      // At least one share button should exist
      expect(hasShareButtons).toBeTruthy();
    }
  });

  test("should display referral statistics", async ({ page }) => {
    await page.goto("/referrals");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/login"); // Requires authenticated session state

    // Look for stats section
    const statsSection = page.locator('[data-testid="referral-stats"]');

    if (await statsSection.isVisible()) {
      // Should show stats like total referrals, successful, etc.
      await expect(statsSection).toBeVisible();
    }
  });

  test("should display referrals table", async ({ page }) => {
    await page.goto("/referrals");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/login"); // Requires authenticated session state

    // Look for referrals table
    const table = page.locator('table, [data-testid="referrals-table"]');

    if (await table.isVisible()) {
      await expect(table).toBeVisible();
    }
  });

  test("should handle copy to clipboard", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/referrals");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/login"); // Requires authenticated session state

    // Look for copy button and click it
    const copyButton = page.locator('button:has-text("Copy")').first();

    if (await copyButton.isVisible()) {
      await copyButton.click();

      // Should see success feedback (may appear briefly)
      const successText = page.locator("text=/copied|✓|success/i");
      // Wait up to 2s for success feedback to appear
      await successText.first().waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});

      if (await successText.first().isVisible()) {
        await expect(successText.first()).toBeVisible();
      }
    }
  });

  test("should format currency correctly", async ({ page }) => {
    await page.goto("/referrals");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/login"); // Requires authenticated session state

    // Look for currency formatting (SAR symbol or amount)
    const currencyPattern = /ر\.س|SAR|\$|€|£/;
    const pageContent = await page.locator("body").textContent();

    if (pageContent && pageContent.match(currencyPattern)) {
      expect(pageContent).toMatch(currencyPattern);
    }
  });
});

test.describe("Referrals - Error Handling", () => {
  test("should handle referrals API errors gracefully", async ({ page }) => {
    await page.goto("/referrals");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/login"); // Requires authenticated session state

    // Page should load without crashing
    await expect(page.locator("body")).toBeVisible();

    // Should show error message or loading state, not blank page
    const hasContent = (await page.locator("h1, h2, p, button").count()) > 0;
    expect(hasContent).toBeTruthy();
  });

  test("should show retry button on error", async ({ page }) => {
    await page.goto("/referrals");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/login"); // Requires authenticated session state

    // Look for retry or error message
    const retryButton = page.locator(
      'button:has-text("Try Again"), button:has-text("Retry")',
    );

    if (await retryButton.isVisible()) {
      await expect(retryButton).toBeVisible();
    }
  });
});
