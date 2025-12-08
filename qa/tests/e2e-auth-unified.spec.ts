/**
 * E2E Authentication Test - Unified NextAuth.js System
 *
 * Tests the complete authentication flow after unifying under NextAuth.js:
 * 1. Email login (Credentials provider)
 * 2. Logout flow
 * 3. Protected route access (no redirect loops)
 * 4. Google OAuth (manual test - requires real Google account)
 * 
 * REQUIRED ENVIRONMENT VARIABLES:
 *   FIXZIT_TEST_ADMIN_PASSWORD - Password for test admin account
 */

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

type PageFixtures = { page: Page };

// 🔐 Use configurable email domain for Business.sa rebrand compatibility
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "fixzit.co";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TEST_EMAIL =
  process.env.FIXZIT_TEST_ADMIN_EMAIL || `superadmin@${EMAIL_DOMAIN}`;

// 🔒 SEC-049: Require password from environment - no hardcoded defaults
const TEST_PASSWORD =
  process.env.FIXZIT_TEST_ADMIN_PASSWORD ||
  process.env.TEST_USER_PASSWORD ||
  process.env.SEED_PASSWORD;
if (!TEST_PASSWORD) {
  throw new Error(
    "❌ FIXZIT_TEST_ADMIN_PASSWORD/TEST_USER_PASSWORD/SEED_PASSWORD is required for E2E tests.",
  );
}

if (
  /fixzit\.co|vercel\.app|production/i.test(BASE_URL) &&
  process.env.ALLOW_E2E_PROD !== "1"
) {
  throw new Error(
    `Refusing to run E2E auth against ${BASE_URL} without ALLOW_E2E_PROD=1`,
  );
}

test.describe("Unified NextAuth Authentication", () => {
  test.beforeEach(async ({ page }: PageFixtures) => {
    // Clear all cookies and storage before each test
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/login`);
  });

  test("should load login page successfully", async ({ page }: PageFixtures) => {
    await page.goto(`${BASE_URL}/login`);

    // Check for key elements
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check for Google OAuth button
    await expect(page.locator("text=/Continue with Google/i")).toBeVisible();
  });

  test("should login with email and password (Credentials provider)", async ({
    page,
  }: PageFixtures) => {
    await page.goto(`${BASE_URL}/login`);

    // Fill in credentials
    await page.fill('input[name="identifier"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL(/\/fm\/dashboard/, { timeout: 10000 });

    // Verify we're on the dashboard
    expect(page.url()).toContain("/fm/dashboard");

    // Check for NextAuth session cookie
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(
      (c) =>
        c.name.includes("authjs.session-token") ||
        c.name.includes("next-auth.session-token"),
    );

    expect(sessionCookie).toBeDefined();
    console.log("✅ Login successful - NextAuth session cookie found");
  });

  test("should NOT have redirect loop when accessing protected route", async ({
    page,
  }: PageFixtures) => {
    // First login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="identifier"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/fm\/dashboard/, { timeout: 10000 });

    // Track redirects
    let redirectCount = 0;
    const redirects: string[] = [];

    page.on("response", (response) => {
      if ([301, 302, 307, 308].includes(response.status())) {
        redirectCount++;
        redirects.push(response.url());
      }
    });

    // Navigate to protected route
    await page.goto(`${BASE_URL}/fm/dashboard`);
    await page.waitForLoadState("networkidle");

    // Should NOT redirect back to login
    expect(page.url()).not.toContain("/login");
    expect(page.url()).toContain("/fm/dashboard");

    // Should have minimal redirects (max 1 for middleware check)
    expect(redirectCount).toBeLessThanOrEqual(1);

    console.log(`✅ No redirect loop detected (${redirectCount} redirects)`);
  });

  test("should redirect unauthenticated user to login", async ({ page }: PageFixtures) => {
    // Try to access protected route without login
    await page.goto(`${BASE_URL}/fm/dashboard`);

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });
    expect(page.url()).toContain("/login");

    console.log("✅ Unauthenticated user correctly redirected to login");
  });

  test("should logout successfully", async ({ page }: PageFixtures) => {
    // First login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="identifier"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/fm\/dashboard/, { timeout: 10000 });

    // Verify we have a session cookie
    let cookies = await page.context().cookies();
    let sessionCookie = cookies.find(
      (c) =>
        c.name.includes("authjs.session-token") ||
        c.name.includes("next-auth.session-token"),
    );
    expect(sessionCookie).toBeDefined();

    // Navigate to logout page
    await page.goto(`${BASE_URL}/logout`);

    // Should redirect to login page
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");

    // Verify session cookie is cleared or expired
    cookies = await page.context().cookies();
    sessionCookie = cookies.find(
      (c) =>
        c.name.includes("authjs.session-token") ||
        c.name.includes("next-auth.session-token"),
    );

    // Cookie should either not exist or be expired/cleared
    if (sessionCookie) {
      expect(sessionCookie.value).toBe("");
    }

    console.log("✅ Logout successful - session cleared");
  });

  test("should show validation errors for invalid credentials", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`);

    // Try with invalid credentials
    await page.fill('input[name="identifier"]', "invalid@example.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Should stay on login page
    await page.waitForTimeout(2000);
    expect(page.url()).toContain("/login");

    // Should show error message
    await expect(page.locator("text=/invalid|incorrect|wrong/i")).toBeVisible({
      timeout: 5000,
    });

    console.log("✅ Invalid credentials correctly rejected");
  });

  test('should remember user with "Remember Me" checkbox', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Fill credentials and check "Remember Me"
    await page.fill('input[name="identifier"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);

    // Check if remember me checkbox exists and check it
    const rememberMeCheckbox = page.locator(
      'input[name="rememberMe"], input[type="checkbox"]',
    );
    if (await rememberMeCheckbox.isVisible()) {
      await rememberMeCheckbox.check();
    }

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/fm\/dashboard/, { timeout: 10000 });

    // Check session cookie maxAge (should be longer for remember me)
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(
      (c) =>
        c.name.includes("authjs.session-token") ||
        c.name.includes("next-auth.session-token"),
    );

    expect(sessionCookie).toBeDefined();

    // Session cookie should have expiry set (not just session cookie)
    if (sessionCookie && sessionCookie.expires > 0) {
      const expiryDate = new Date(sessionCookie.expires * 1000);
      const now = new Date();
      const daysDiff =
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      // Should be at least 7 days (or whatever your rememberMe maxAge is)
      expect(daysDiff).toBeGreaterThan(1);
      console.log(
        `✅ Remember Me working - session expires in ${Math.round(daysDiff)} days`,
      );
    }
  });

  // Note: Google OAuth test requires manual testing with real account
  test.skip("should login with Google OAuth (manual test)", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`);

    // Click Google OAuth button
    await page.click("text=/Continue with Google/i");

    // This would open Google's OAuth flow
    // Manual testing required
    console.log(
      "⚠️  Google OAuth test requires manual testing with real Google account",
    );
  });
});
