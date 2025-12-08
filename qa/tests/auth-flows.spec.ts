import { test, expect } from "@playwright/test";

/**
 * Authentication Flow Integration Tests
 * Tests the unified NextAuth.js authentication system
 *
 * Tests:
 * 1. Email login (personal users) via Credentials provider
 * 2. Logout flow via NextAuth signOut
 * 3. Protected route access (no redirect loops)
 */

// 🔐 Use configurable email domain for Business.sa rebrand compatibility
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "fixzit.co";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// Test credentials (from database)
const TEST_USER = {
  email: `admin@${EMAIL_DOMAIN}`,
  password: "password123",
};

test.describe("Authentication Flows", () => {
  test.beforeEach(async ({ page }) => {
    // Clear all cookies and storage before each test
    await page.context().clearCookies();
  });

  test("should successfully log in with email and password", async ({
    page,
  }) => {
    // Go to login page
    await page.goto(`${BASE_URL}/login`);

    // Wait for page to load - check for login form
    await expect(page.locator('[data-testid="login-email"]')).toBeVisible({
      timeout: 10000,
    });

    // Fill in login form using test ID selectors
    await page.fill('[data-testid="login-email"]', TEST_USER.email);
    await page.fill('[data-testid="login-password"]', TEST_USER.password);

    // Submit form
    await page.click('[data-testid="login-submit"]');

    // Wait for successful redirect to dashboard
    await page.waitForURL(/\/(fm\/dashboard|dashboard|home)/, {
      timeout: 10000,
    });

    // Verify we're logged in by checking for user elements in the dashboard
    const dashboardElement = page.locator("body");
    await expect(dashboardElement).toBeVisible({ timeout: 5000 });

    // Test that we can navigate to different protected pages without being redirected
    // This tests that there's no infinite redirect loop
    const protectedPaths = ["/fm/dashboard", "/properties", "/work-orders"];

    for (const path of protectedPaths) {
      await page.goto(`${BASE_URL}${path}`);
      // Should not redirect to login - verify we're still on the protected page or a valid internal page
      await expect(page).not.toHaveURL(/\/login/);
      console.log(`✅ Successfully accessed ${path} without redirect loop`);
    }
  });

  test("should prevent access to protected routes when not logged in", async ({
    page,
  }) => {
    // Try to access a protected route without logging in
    await page.goto(`${BASE_URL}/fm/dashboard`);

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });

    expect(page.url()).toContain("/login");
    console.log("✅ Unauthenticated access correctly redirected to login");
  });

  test("should access protected routes after login without redirect loops", async ({
    page,
  }) => {
    // First, log in
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('[data-testid="login-email"]')).toBeVisible({
      timeout: 10000,
    });
    await page.fill('[data-testid="login-email"]', TEST_USER.email);
    await page.fill('[data-testid="login-password"]', TEST_USER.password);
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL(/\/(fm\/dashboard|dashboard|home)/, {
      timeout: 10000,
    });

    // Now try accessing another protected route
    await page.goto(`${BASE_URL}/fm/dashboard`);

    // Should NOT redirect to login
    await page.waitForTimeout(2000); // Wait to ensure no redirect happens

    const url = page.url();
    expect(url).not.toContain("/login");
    expect(url).toContain("/fm/dashboard");

    console.log(
      "✅ Protected route access successful - No redirect loops detected",
    );
  });

  test("should successfully log out", async ({ page }) => {
    // First, log in
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('[data-testid="login-email"]')).toBeVisible({
      timeout: 10000,
    });
    await page.fill('[data-testid="login-email"]', TEST_USER.email);
    await page.fill('[data-testid="login-password"]', TEST_USER.password);
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL(/\/(fm\/dashboard|dashboard|home)/, {
      timeout: 10000,
    });

    // Now log out
    await page.goto(`${BASE_URL}/logout`);

    // Should redirect to login page
    await page.waitForURL(/\/login/, { timeout: 5000 });

    // Verify session cookie is cleared
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(
      (c) =>
        c.name.includes("authjs.session-token") ||
        c.name.includes("next-auth.session-token"),
    );

    // Cookie should either not exist or be expired
    if (sessionCookie) {
      expect(sessionCookie.value).toBe("");
    }

    // Try accessing protected route again - should redirect to login
    await page.goto(`${BASE_URL}/fm/dashboard`);
    await page.waitForURL(/\/login/, { timeout: 5000 });

    expect(page.url()).toContain("/login");
    console.log(
      "✅ Logout successful - Session cleared and protected routes inaccessible",
    );
  });

  test("should show error message for invalid credentials", async ({
    page,
  }) => {
    // Go to login page
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('[data-testid="login-email"]')).toBeVisible({
      timeout: 10000,
    });

    // Try logging in with invalid credentials
    await page.fill('[data-testid="login-email"]', TEST_USER.email);
    await page.fill('[data-testid="login-password"]', "wrongpassword123");
    await page.click('[data-testid="login-submit"]');

    // Wait for error message to appear
    await page.waitForSelector("text=/invalid|incorrect|wrong/i", {
      timeout: 10000,
    });

    // Should stay on login page
    expect(page.url()).toContain("/login");

    // Verify error message is visible
    const errorMessage = page.locator("text=/invalid|incorrect|wrong/i");
    await expect(errorMessage).toBeVisible();

    console.log("✅ Invalid credentials correctly rejected with error message");
  });
});
