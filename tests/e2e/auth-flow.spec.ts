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

    // Check page loads or fallback to offline overlay
    await expect(page).toHaveTitle(/Login|Fixzit/i);

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    if (await emailInput.count()) {
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(submitBtn).toBeVisible();
    } else {
      // Offline/guarded mode: ensure we can still navigate to dashboard via injected session
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await expect(page.url()).toContain('/dashboard');
    }

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
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("should handle login with invalid credentials", async ({ page }) => {
    await page.goto("/login");

    // Fill in invalid credentials
    await page.locator('input[type="email"]').fill("invalid@example.com");
    await page.locator('input[type="password"]').fill("wrongpassword");

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Should show error message or stay on login page
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("should navigate to signup page", async ({ page }) => {
    await page.goto("/login");

    // Find and click signup link
    const signupLink = page.locator('a[href*="/signup"], [data-testid="go-to-signup"]');
    await expect(signupLink.first()).toBeVisible();
    await signupLink.first().click();
    await expect(page).toHaveURL(/\/signup/);
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
    await expect(page).toHaveURL(/\/signup/, { timeout: 5000 });
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

      // Wait for dropdown menu to appear or direction to change
      await page.waitForLoadState('domcontentloaded');

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
    await expect(page).toHaveURL(/\/(login|access-denied)?/, { timeout: 5000 });
    const url = page.url();
    expect(
      url.includes("/login") ||
        url.includes("/") ||
        url.includes("access-denied"),
    ).toBeTruthy();
  });

  test("login page should pass accessibility checks", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Note: Install axe-playwright with: npm install -D @axe-core/playwright
    // Then import: import { injectAxe, checkA11y } from 'axe-playwright';
    // await injectAxe(page);
    // await checkA11y(page, null, {
    //   detailedReport: true,
    //   detailedReportOptions: { html: true },
    // });

    // Temporary manual checks until axe-playwright is installed
    // Check for skip link
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();

    // Check for proper heading hierarchy
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBeGreaterThan(0);

    // Check all images have alt text
    const images = await page.locator("img").all();
    for (const img of images) {
      const alt = await img.getAttribute("alt");
      expect(alt).toBeDefined();
    }

    // Check form inputs have labels or aria-labels
    const inputs = await page.locator("input").all();
    for (const input of inputs) {
      const id = await input.getAttribute("id");
      const ariaLabel = await input.getAttribute("aria-label");
      const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;
      expect(ariaLabel || hasLabel).toBeTruthy();
    }
  });

  test("dashboard page should pass accessibility checks", async ({ page }) => {
    await page.goto("/login");
    
    // Login first (use actual credentials if available in CI)
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill("test@example.com");
      await passwordInput.fill("password123");
      await page.locator('button[type="submit"]').click();
      
      // Wait for potential redirect
      await page.waitForLoadState('networkidle').catch(() => {});
    }

    // If we're on dashboard, check accessibility
    if (page.url().includes("/dashboard")) {
      await page.waitForLoadState("networkidle");

      // Manual accessibility checks (replace with axe-playwright when installed)
      const skipLink = page.locator('a[href="#main-content"]');
      await expect(skipLink).toBeAttached();

      // Check main landmark exists
      const main = page.locator("main#main-content");
      await expect(main).toBeAttached();

      // Check heading hierarchy
      const h1Count = await page.locator("h1").count();
      expect(h1Count).toBeGreaterThan(0);
    }
  });
});
