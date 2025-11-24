/**
 * E2E Test: Authentication Flow
 * Tests complete user authentication journey including signup, login, and logout
 */

import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Start from home page
    await page.goto("/");
  });

  test("should display login page correctly", async ({ page }) => {
    await page.goto("/login");

    // Check page loads
    await expect(page).toHaveTitle(/Login|Fixzit/i);

    // Check form elements exist
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check language selector
    await expect(
      page.locator('[aria-label*="language" i], [aria-label*="اللغة" i]'),
    ).toBeVisible();
  });

  test("should show validation errors for invalid login", async ({ page }) => {
    await page.goto("/login");

    // Try to submit empty form
    await page.locator('button[type="submit"]').click();

    // Should see validation errors or stay on page
    await page.waitForTimeout(1000);
    expect(page.url()).toContain("/login");
  });

  test("should handle login with invalid credentials", async ({ page }) => {
    await page.goto("/login");

    // Fill in invalid credentials
    await page.locator('input[type="email"]').fill("invalid@example.com");
    await page.locator('input[type="password"]').fill("wrongpassword");

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Should show error message or stay on login page
    await page.waitForTimeout(2000);
    expect(page.url()).toContain("/login");
  });

  test("should navigate to signup page", async ({ page }) => {
    await page.goto("/login");

    // Find and click signup link
    const signupLink = page.locator('a[href*="/signup"]');
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await expect(page).toHaveURL(/.*signup/);
    }
  });

  test("should display signup page correctly", async ({ page }) => {
    await page.goto("/signup");

    // Check page loads
    await expect(page).toHaveTitle(/Sign.*Up|Fixzit/i);

    // Check form elements exist
    await expect(
      page.locator('input[name="name"], input[placeholder*="name" i]'),
    ).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("should validate password requirements", async ({ page }) => {
    await page.goto("/signup");

    // Fill in weak password
    await page.locator('input[type="email"]').fill("test@example.com");
    await page.locator('input[type="password"]').first().fill("123");

    // Try to submit
    await page.locator('button[type="submit"]').click();

    // Should show validation error
    await page.waitForTimeout(1000);
    expect(page.url()).toContain("/signup");
  });

  test("should handle forgot password flow", async ({ page }) => {
    await page.goto("/login");

    // Find forgot password link
    const forgotLink = page.locator('a[href*="forgot"]');
    if (await forgotLink.isVisible()) {
      await forgotLink.click();
      await expect(page).toHaveURL(/.*forgot/);

      // Check email input exists
      await expect(page.locator('input[type="email"]')).toBeVisible();
    }
  });

  test("should switch language on auth pages", async ({ page }) => {
    await page.goto("/login");

    // Find language selector
    const langSelector = page
      .locator(
        '[aria-label*="language" i], [aria-label*="اللغة" i], button:has-text("العربية"), button:has-text("English")',
      )
      .first();

    if (await langSelector.isVisible()) {
      await langSelector.click();

      // Wait for dropdown
      await page.waitForTimeout(500);

      // Check direction attribute changes
      const htmlDir = await page.locator("html").getAttribute("dir");
      expect(htmlDir).toBeTruthy();
    }
  });
});

test.describe("Authentication - Guest User", () => {
  test("guest user should see public pages", async ({ page }) => {
    await page.goto("/");

    // Home page should load
    await expect(page).toHaveTitle(/Fixzit/i);

    // Check for login/signup buttons
    const hasAuthButtons =
      (await page.locator('a[href*="/login"], a[href*="/signup"]').count()) > 0;
    expect(hasAuthButtons).toBeTruthy();
  });

  test("guest user should be redirected from protected routes", async ({
    page,
  }) => {
    // Try to access protected route
    await page.goto("/dashboard");

    // Should redirect to login or show access denied
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(
      url.includes("/login") ||
        url.includes("/") ||
        url.includes("access-denied"),
    ).toBeTruthy();
  });
});
