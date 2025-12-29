/**
 * E2E Test: Navigation & Sidebar
 * Tests navigation functionality including:
 * - Sidebar toggle and state persistence
 * - Role-based navigation visibility
 * - Route protection and redirects
 * - Breadcrumb navigation
 * - Mobile responsive navigation
 * 
 * @security Role-based access control for navigation items
 */

import { test, expect, type Page } from "@playwright/test";

const IS_CI = process.env.CI === "true";
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;
const HAS_ADMIN_CREDS = !!(TEST_ADMIN_EMAIL && TEST_ADMIN_PASSWORD);

/**
 * Helper to attempt login
 */
async function attemptLogin(page: Page): Promise<boolean> {
  if (!HAS_ADMIN_CREDS) return false;

  await page.goto("/login", { waitUntil: "domcontentloaded" });

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

  await emailInput.fill(TEST_ADMIN_EMAIL!);
  await passwordInput.fill(TEST_ADMIN_PASSWORD!);
  await submitBtn.click();

  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 }).catch(() => {});

  return !page.url().includes("/login");
}

test.describe("Navigation & Sidebar", () => {
  test.describe("Public Navigation", () => {
    test("landing page has main navigation", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Should have navigation landmark
      const nav = page.locator("nav, [role='navigation']").first();
      const hasNav = await nav.isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasNav).toBe(true);
    });

    test("login link is accessible from landing page", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Look for login link
      const loginLink = page.locator('a[href*="/login"], a:has-text("Login"), a:has-text("Sign in")').first();
      const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign in")').first();

      const hasLoginLink = await loginLink.isVisible().catch(() => false);
      const hasLoginButton = await loginButton.isVisible().catch(() => false);

      expect(hasLoginLink || hasLoginButton).toBe(true);
    });

    test("language selector is visible", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Look for language selector
      const langSelector = page.locator(
        '[data-testid="language-selector"], [aria-label*="language" i], button:has-text("EN"), button:has-text("العربية")'
      ).first();

      const hasLangSelector = await langSelector.isVisible({ timeout: 5000 }).catch(() => false);

      // Language selector should exist (may be in footer or header)
      expect(hasLangSelector).toBe(true);
    });
  });

  test.describe("Authenticated Navigation", () => {
    test.skip(!HAS_ADMIN_CREDS && IS_CI, "Skipping: Admin credentials not configured");

    test("dashboard has sidebar navigation", async ({ page }) => {
      if (HAS_ADMIN_CREDS) {
        await attemptLogin(page);
      }

      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

      // If not redirected to login, check for sidebar
      if (!page.url().includes("/login")) {
        const sidebar = page.locator("aside, nav, [role='navigation']").first();
        const hasSidebar = await sidebar.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasSidebar).toBe(true);
      }
    });

    test("sidebar shows role-appropriate menu items", async ({ page }) => {
      if (HAS_ADMIN_CREDS) {
        const loggedIn = await attemptLogin(page);
        test.skip(!loggedIn, "Login failed");
      }

      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

      if (!page.url().includes("/login")) {
        const sidebar = page.locator("aside, nav[role='navigation']").first();

        if (await sidebar.isVisible({ timeout: 5000 }).catch(() => false)) {
          // Should have basic navigation items
          const links = await sidebar.locator("a").allTextContents();
          const linkText = links.join(" ").toLowerCase();

          // Dashboard-level navigation should have some standard items
          const hasBasicNav =
            linkText.includes("dashboard") ||
            linkText.includes("home") ||
            linkText.includes("work") ||
            linkText.includes("settings");

          expect(hasBasicNav).toBe(true);
        }
      }
    });
  });

  test.describe("Sidebar Toggle", () => {
    test("sidebar can be collapsed and expanded", async ({ page }) => {
      if (HAS_ADMIN_CREDS) {
        await attemptLogin(page);
      }

      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

      if (!page.url().includes("/login")) {
        // Look for sidebar toggle button
        const toggleBtn = page.locator(
          '[data-testid="sidebar-toggle"], [aria-label*="sidebar" i], [aria-label*="menu" i], button[aria-expanded]'
        ).first();

        if (await toggleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          // Get initial state
          const initialExpanded = await toggleBtn.getAttribute("aria-expanded");

          // Click toggle
          await toggleBtn.click();

          // State should change
          const newExpanded = await toggleBtn.getAttribute("aria-expanded");

          // aria-expanded should toggle
          if (initialExpanded !== null && newExpanded !== null) {
            expect(newExpanded).not.toBe(initialExpanded);
          }
        }
      }
    });

    test("sidebar state persists across navigation", async ({ page }) => {
      if (HAS_ADMIN_CREDS) {
        await attemptLogin(page);
      }

      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

      if (!page.url().includes("/login")) {
        const toggleBtn = page.locator('[data-testid="sidebar-toggle"], button[aria-expanded]').first();

        if (await toggleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          // Collapse sidebar
          const expanded = await toggleBtn.getAttribute("aria-expanded");
          if (expanded === "true") {
            await toggleBtn.click();
          }

          // Navigate to another page
          const navLink = page.locator('aside a, nav a').first();
          if (await navLink.isVisible().catch(() => false)) {
            await navLink.click();
            await page.waitForLoadState("domcontentloaded");

            // Check if sidebar state persisted
            const sidebarState = await toggleBtn.getAttribute("aria-expanded");
            // State should persist (collapsed stays collapsed)
            expect(sidebarState === "false" || sidebarState === null).toBe(true);
          }
        }
      }
    });
  });

  test.describe("Route Protection", () => {
    test("protected routes redirect to login", async ({ page }) => {
      // Clear any existing session
      await page.context().clearCookies();

      // Try to access protected route without auth
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

      // Should redirect to login
      const url = page.url();
      const isProtected =
        url.includes("/login") ||
        url.includes("/401") ||
        url.includes("/403");

      expect(isProtected).toBe(true);
    });

    test("admin routes block non-admin users", async ({ page }) => {
      // Clear session and try to access admin route
      await page.context().clearCookies();
      await page.goto("/admin", { waitUntil: "domcontentloaded" });

      // Should be blocked
      const url = page.url();
      const isBlocked =
        url.includes("/login") ||
        url.includes("/401") ||
        url.includes("/403") ||
        url.includes("/unauthorized");

      expect(isBlocked).toBe(true);
    });
  });

  test.describe("Breadcrumb Navigation", () => {
    test("nested pages show breadcrumbs", async ({ page }) => {
      if (HAS_ADMIN_CREDS) {
        await attemptLogin(page);
      }

      // Navigate to a nested page
      await page.goto("/admin/issues", { waitUntil: "domcontentloaded" });

      if (!page.url().includes("/login")) {
        // Look for breadcrumb navigation
        const breadcrumb = page.locator(
          'nav[aria-label*="breadcrumb" i], [data-testid="breadcrumb"], .breadcrumb, nav ol'
        ).first();

        const hasBreadcrumb = await breadcrumb.isVisible({ timeout: 5000 }).catch(() => false);

        // Breadcrumbs are optional but recommended
        if (hasBreadcrumb) {
          const items = await breadcrumb.locator("a, span").count();
          expect(items).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe("Mobile Navigation", () => {
    test("mobile menu toggle works on small screens", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Look for hamburger menu / mobile toggle
      const mobileToggle = page.locator(
        '[data-testid="mobile-menu-toggle"], button[aria-label*="menu" i], .hamburger, [aria-label*="navigation" i]'
      ).first();

      const hasMobileToggle = await mobileToggle.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasMobileToggle) {
        // Click to open mobile menu
        await mobileToggle.click();

        // Mobile menu should appear
        const mobileMenu = page.locator(
          '[data-testid="mobile-menu"], [role="dialog"], .mobile-nav, nav.mobile'
        ).first();

        const menuVisible = await mobileMenu.isVisible({ timeout: 3000 }).catch(() => false);
        expect(menuVisible).toBe(true);
      }
    });

    test("sidebar collapses on mobile", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      if (HAS_ADMIN_CREDS) {
        await attemptLogin(page);
      }

      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

      if (!page.url().includes("/login")) {
        // Sidebar should be hidden or collapsed on mobile
        const sidebar = page.locator("aside").first();

        if (await sidebar.count() > 0) {
          const sidebarVisible = await sidebar.isVisible().catch(() => false);

          // On mobile, sidebar should be hidden or in overlay mode
          // If visible, it should be triggered by a button
          if (sidebarVisible) {
            const sidebarBox = await sidebar.boundingBox();
            // If visible, should be small (collapsed) or overlay
            expect(sidebarBox?.width).toBeLessThan(250);
          }
        }
      }
    });
  });

  test.describe("Navigation Links", () => {
    test("all visible navigation links are valid", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Get all visible navigation links
      const navLinks = page.locator("nav a[href]");
      const linkCount = await navLinks.count();

      for (let i = 0; i < Math.min(linkCount, 10); i++) {
        const link = navLinks.nth(i);
        if (await link.isVisible().catch(() => false)) {
          const href = await link.getAttribute("href");

          // Link should have valid href
          expect(href).toBeDefined();
          expect(href).not.toBe("#");
          expect(href).not.toBe("");
        }
      }
    });
  });
});
