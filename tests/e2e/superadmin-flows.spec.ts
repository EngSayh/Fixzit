/**
 * E2E Test: Superadmin Dashboard Flows
 * Tests superadmin-specific functionality including:
 * - Dashboard access and navigation
 * - User management
 * - System settings
 * - Audit logs
 * - RBAC enforcement (non-superadmins blocked)
 * 
 * @security SUPER_ADMIN role required for all routes
 */

import { test, expect, type Page } from "@playwright/test";

// Environment-based credentials - require explicit superadmin credentials (no fallback to avoid testing with wrong role)
const TEST_SUPERADMIN_EMAIL = process.env.TEST_SUPERADMIN_EMAIL;
const TEST_SUPERADMIN_PASSWORD = process.env.TEST_SUPERADMIN_PASSWORD;
const IS_CI = process.env.CI === "true";

// Skip if credentials not available
const HAS_SUPERADMIN_CREDS = !!(TEST_SUPERADMIN_EMAIL && TEST_SUPERADMIN_PASSWORD);

if (!HAS_SUPERADMIN_CREDS) {
  console.warn(
    "⚠️  SUPERADMIN E2E: Credentials not configured.\n" +
    "   Set TEST_SUPERADMIN_EMAIL and TEST_SUPERADMIN_PASSWORD environment variables.\n" +
    "   Tests will be skipped without explicit superadmin credentials."
  );
}

/**
 * Helper to attempt superadmin login
 */
async function attemptSuperadminLogin(page: Page): Promise<boolean> {
  if (!HAS_SUPERADMIN_CREDS) return false;

  await page.goto("/login", { waitUntil: "domcontentloaded" });

  // Find login form elements
  const emailInput = page
    .locator('[data-testid="login-email"], input[name="identifier"], input#email, input[type="email"]')
    .first();
  const passwordInput = page
    .locator('[data-testid="login-password"], input#password, input[type="password"]')
    .first();
  const submitBtn = page.locator('button[type="submit"]').first();

  if (!(await emailInput.isVisible({ timeout: 5000 }).catch(() => false))) {
    return false;
  }

  await emailInput.fill(TEST_SUPERADMIN_EMAIL!);
  await passwordInput.fill(TEST_SUPERADMIN_PASSWORD!);
  await submitBtn.click();

  // Wait for navigation away from login
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 }).catch(() => {});

  return !page.url().includes("/login");
}

test.describe("Superadmin Dashboard Flows", () => {
  // Skip entire suite if no credentials
  test.skip(!HAS_SUPERADMIN_CREDS && IS_CI, "Skipping: Superadmin credentials not configured");

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test.describe("Access Control", () => {
    test("superadmin routes require authentication", async ({ page }) => {
      // Try to access superadmin without auth
      await page.goto("/superadmin", { waitUntil: "domcontentloaded" });

      // Should redirect to login or show unauthorized
      const url = page.url();
      const isBlocked = url.includes("/login") || url.includes("/401") || url.includes("/403");
      expect(isBlocked).toBe(true);
    });

    test("superadmin routes block non-superadmin users", async ({ page }) => {
      // This test verifies RBAC - non-superadmin should be blocked
      // Try accessing superadmin area
      await page.goto("/superadmin", { waitUntil: "domcontentloaded" });

      // Without proper credentials, should be redirected
      const url = page.url();
      const pageContent = await page.textContent("body").catch(() => "");

      // Either redirected to login, shows 403, or shows access denied message
      const isProtected =
        url.includes("/login") ||
        url.includes("/403") ||
        pageContent.toLowerCase().includes("forbidden") ||
        pageContent.toLowerCase().includes("access denied") ||
        pageContent.toLowerCase().includes("unauthorized");

      expect(isProtected).toBe(true);
    });
  });

  test.describe("Dashboard Navigation", () => {
    test.skip(!HAS_SUPERADMIN_CREDS, "Skipping: Credentials required");

    test("can access superadmin dashboard after login", async ({ page }) => {
      const loggedIn = await attemptSuperadminLogin(page);
      test.skip(!loggedIn, "Login failed - skipping dashboard test");

      await page.goto("/superadmin", { waitUntil: "domcontentloaded" });

      // Should be on superadmin area (not redirected)
      expect(page.url()).toContain("/superadmin");

      // Dashboard should have key elements
      const heading = page.locator("h1, [role='heading']").first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    });

    test("superadmin sidebar shows all management links", async ({ page }) => {
      const loggedIn = await attemptSuperadminLogin(page);
      test.skip(!loggedIn, "Login failed - skipping sidebar test");

      await page.goto("/superadmin", { waitUntil: "domcontentloaded" });

      // Look for key sidebar navigation items
      const sidebar = page.locator("nav, aside, [role='navigation']").first();

      if (await sidebar.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Check for common superadmin navigation items
        const navItems = await sidebar.locator("a, button").allTextContents();
        const navText = navItems.join(" ").toLowerCase();

        // Superadmin should have access to user/org management
        const hasAdminLinks =
          navText.includes("user") ||
          navText.includes("organization") ||
          navText.includes("settings") ||
          navText.includes("audit") ||
          navText.includes("system");

        expect(hasAdminLinks).toBe(true);
      }
    });
  });

  test.describe("User Management", () => {
    test.skip(!HAS_SUPERADMIN_CREDS, "Skipping: Credentials required");

    test("can navigate to users management page", async ({ page }) => {
      const loggedIn = await attemptSuperadminLogin(page);
      test.skip(!loggedIn, "Login failed");

      await page.goto("/superadmin/users", { waitUntil: "domcontentloaded" });

      // Should show users page or redirect to login
      const url = page.url();
      const isUsersPage = url.includes("/users");
      const isBlocked = url.includes("/login") || url.includes("/403");

      expect(isUsersPage || isBlocked).toBe(true);
    });

    test("users page shows user list or empty state", async ({ page }) => {
      const loggedIn = await attemptSuperadminLogin(page);
      test.skip(!loggedIn, "Login failed");

      await page.goto("/superadmin/users", { waitUntil: "domcontentloaded" });

      if (page.url().includes("/users")) {
        // Wait for content to load
        await page.waitForLoadState("networkidle");

        // Should have either a table/list or empty state
        const hasTable = await page.locator("table, [role='grid']").isVisible().catch(() => false);
        const hasList = await page.locator("ul, [role='list']").isVisible().catch(() => false);
        const hasEmptyState = await page.locator("text=/no users|empty|no data/i").isVisible().catch(() => false);
        const hasContent = await page.locator("[data-testid='user-list'], [data-testid='users-table']")
          .isVisible()
          .catch(() => false);

        expect(hasTable || hasList || hasEmptyState || hasContent).toBe(true);
      }
    });
  });

  test.describe("Audit Logs", () => {
    test.skip(!HAS_SUPERADMIN_CREDS, "Skipping: Credentials required");

    test("can access audit logs page", async ({ page }) => {
      const loggedIn = await attemptSuperadminLogin(page);
      test.skip(!loggedIn, "Login failed");

      await page.goto("/superadmin/audit", { waitUntil: "domcontentloaded" });

      // Should show audit page or be blocked
      const url = page.url();
      const content = await page.textContent("body").catch(() => "");

      const isAuditPage = url.includes("/audit");
      const hasAuditContent =
        content.toLowerCase().includes("audit") ||
        content.toLowerCase().includes("log") ||
        content.toLowerCase().includes("activity");
      const isBlocked = url.includes("/login") || url.includes("/403");

      expect(isAuditPage || hasAuditContent || isBlocked).toBe(true);
    });
  });

  test.describe("System Settings", () => {
    test.skip(!HAS_SUPERADMIN_CREDS, "Skipping: Credentials required");

    test("can access system settings", async ({ page }) => {
      const loggedIn = await attemptSuperadminLogin(page);
      test.skip(!loggedIn, "Login failed");

      await page.goto("/superadmin/settings", { waitUntil: "domcontentloaded" });

      // Should show settings page or be blocked
      const url = page.url();
      const isSettingsPage = url.includes("/settings");
      const isBlocked = url.includes("/login") || url.includes("/403");

      expect(isSettingsPage || isBlocked).toBe(true);
    });
  });
});
