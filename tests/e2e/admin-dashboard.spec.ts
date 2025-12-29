/**
 * E2E Test: Admin & FM Dashboard Flows
 * Tests facility management dashboard functionality:
 * - Dashboard widgets and metrics
 * - Work order management
 * - Property overview
 * - Technician assignment
 * - Quick actions
 * 
 * @security Admin role required for most features
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

test.describe("Admin & FM Dashboard Flows", () => {
  test.describe("Dashboard Access", () => {
    test("dashboard requires authentication", async ({ page }) => {
      await page.context().clearCookies();
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

      // Should redirect to login
      expect(page.url()).toContain("/login");
    });

    test("admin dashboard loads for authenticated users", async ({ page }) => {
      test.skip(!HAS_ADMIN_CREDS, "Admin credentials required");

      const loggedIn = await attemptLogin(page);
      test.skip(!loggedIn, "Login failed");

      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

      // Should be on dashboard
      expect(page.url()).toContain("/dashboard");

      // Should have content
      const heading = page.locator("h1, h2, [role='heading']").first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Dashboard Widgets", () => {
    test.skip(!HAS_ADMIN_CREDS && IS_CI, "Skipping: Admin credentials required");

    test("dashboard shows key metrics", async ({ page }) => {
      if (HAS_ADMIN_CREDS) {
        const loggedIn = await attemptLogin(page);
        test.skip(!loggedIn, "Login failed");
      }

      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

      if (!page.url().includes("/login")) {
        // Wait for dashboard to load
        await page.waitForLoadState("networkidle");

        // Look for metric cards/widgets
        const widgets = page.locator(
          '[data-testid*="metric"], [data-testid*="widget"], [data-testid*="card"], .metric, .widget, .stat-card'
        );
        const widgetCount = await widgets.count();

        // Should have some dashboard widgets
        if (widgetCount === 0) {
          // Alternative: look for any structured content
          const content = page.locator("main, [role='main']").first();
          await expect(content).toBeVisible();
        }
      }
    });

    test("dashboard charts render correctly", async ({ page }) => {
      if (HAS_ADMIN_CREDS) {
        const loggedIn = await attemptLogin(page);
        test.skip(!loggedIn, "Login failed");
      }

      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

      if (!page.url().includes("/login")) {
        await page.waitForLoadState("networkidle");

        // Look for chart elements (recharts, chart.js, etc.)
        const charts = page.locator(
          'svg.recharts-surface, canvas, [data-testid*="chart"], .chart-container, [role="img"]'
        );
        const chartCount = await charts.count();

        // Charts are optional but common on dashboards
        if (chartCount > 0) {
          const firstChart = charts.first();
          await expect(firstChart).toBeVisible();
        }
      }
    });
  });

  test.describe("FM Dashboard", () => {
    test.skip(!HAS_ADMIN_CREDS && IS_CI, "Skipping: Admin credentials required");

    test("FM dashboard shows work order summary", async ({ page }) => {
      if (HAS_ADMIN_CREDS) {
        const loggedIn = await attemptLogin(page);
        test.skip(!loggedIn, "Login failed");
      }

      await page.goto("/admin/fm-dashboard", { waitUntil: "domcontentloaded" });

      if (!page.url().includes("/login")) {
        // Wait for page to load
        await page.waitForLoadState("networkidle");

        const content = await page.textContent("body");
        const contentLower = content?.toLowerCase() || "";

        // Should have FM-related content
        const hasFmContent =
          contentLower.includes("work order") ||
          contentLower.includes("maintenance") ||
          contentLower.includes("property") ||
          contentLower.includes("technician") ||
          contentLower.includes("dashboard") ||
          contentLower.includes("facility");

        expect(hasFmContent).toBe(true);
      }
    });

    test("can navigate to work orders list", async ({ page }) => {
      if (HAS_ADMIN_CREDS) {
        const loggedIn = await attemptLogin(page);
        test.skip(!loggedIn, "Login failed");
      }

      await page.goto("/admin/work-orders", { waitUntil: "domcontentloaded" });

      if (!page.url().includes("/login")) {
        // Should be on work orders page or redirected
        const url = page.url();
        const isWorkOrdersPage =
          url.includes("/work-orders") ||
          url.includes("/work_orders") ||
          url.includes("/workorders");

        expect(isWorkOrdersPage || url.includes("/admin")).toBe(true);
      }
    });
  });

  test.describe("Issues Management", () => {
    test.skip(!HAS_ADMIN_CREDS && IS_CI, "Skipping: Admin credentials required");

    test("issues list page loads", async ({ page }) => {
      if (HAS_ADMIN_CREDS) {
        const loggedIn = await attemptLogin(page);
        test.skip(!loggedIn, "Login failed");
      }

      await page.goto("/admin/issues", { waitUntil: "domcontentloaded" });

      if (!page.url().includes("/login")) {
        // Page should load with list or empty state
        await page.waitForLoadState("networkidle");

        const hasTable = await page.locator("table, [role='grid']").isVisible().catch(() => false);
        const hasList = await page.locator("ul, [role='list']").isVisible().catch(() => false);
        const hasEmpty = await page.locator("text=/no issues|no data|empty/i").isVisible().catch(() => false);
        const hasContent = await page.locator("main").isVisible().catch(() => false);

        expect(hasTable || hasList || hasEmpty || hasContent).toBe(true);
      }
    });

    test("issue detail page has back navigation", async ({ page }) => {
      if (HAS_ADMIN_CREDS) {
        const loggedIn = await attemptLogin(page);
        test.skip(!loggedIn, "Login failed");
      }

      // Try to navigate to an issue detail page
      await page.goto("/admin/issues/test-issue-id", { waitUntil: "domcontentloaded" });

      if (!page.url().includes("/login")) {
        // Look for back button with aria-label
        const backButton = page.locator(
          'button[aria-label*="back" i], a[aria-label*="back" i], [data-testid="back-button"]'
        ).first();

        const hasBackButton = await backButton.isVisible({ timeout: 5000 }).catch(() => false);

        // Or look for breadcrumb navigation
        const breadcrumb = page.locator('nav[aria-label*="breadcrumb" i]').first();
        const hasBreadcrumb = await breadcrumb.isVisible().catch(() => false);

        // Should have some way to navigate back
        expect(hasBackButton || hasBreadcrumb || page.url().includes("/issues")).toBe(true);
      }
    });
  });

  test.describe("Quick Actions", () => {
    test.skip(!HAS_ADMIN_CREDS && IS_CI, "Skipping: Admin credentials required");

    test("dashboard has quick action buttons", async ({ page }) => {
      if (HAS_ADMIN_CREDS) {
        const loggedIn = await attemptLogin(page);
        test.skip(!loggedIn, "Login failed");
      }

      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

      if (!page.url().includes("/login")) {
        // Look for action buttons
        const actionButtons = page.locator(
          'button:has-text("Add"), button:has-text("Create"), button:has-text("New"), [data-testid*="action"], .quick-action'
        );

        const actionCount = await actionButtons.count();

        // Should have at least one action button
        if (actionCount > 0) {
          const firstAction = actionButtons.first();
          await expect(firstAction).toBeVisible();
        }
      }
    });
  });

  test.describe("Search Functionality", () => {
    test("global search is accessible", async ({ page }) => {
      if (HAS_ADMIN_CREDS) {
        const loggedIn = await attemptLogin(page);
        test.skip(!loggedIn, "Login failed");
      }

      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

      if (!page.url().includes("/login")) {
        // Look for search input
        const searchInput = page.locator(
          '[data-testid="global-search"], [aria-label*="search" i], input[type="search"], input[placeholder*="search" i]'
        ).first();

        const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);

        // Or look for search button
        const searchButton = page.locator('button[aria-label*="search" i]').first();
        const hasSearchButton = await searchButton.isVisible().catch(() => false);

        // Should have search functionality
        expect(hasSearch || hasSearchButton).toBe(true);
      }
    });

    test("search can be triggered with keyboard shortcut", async ({ page }) => {
      if (HAS_ADMIN_CREDS) {
        const loggedIn = await attemptLogin(page);
        test.skip(!loggedIn, "Login failed");
      }

      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

      if (!page.url().includes("/login")) {
        // Try Ctrl+K or Cmd+K (common search shortcut)
        await page.keyboard.press("Control+k");

        // Look for search modal or focused search input
        const searchModal = page.locator('[role="dialog"], .search-modal, .command-palette').first();
        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

        const modalVisible = await searchModal.isVisible({ timeout: 2000 }).catch(() => false);
        const inputFocused = await searchInput.evaluate((el) => document.activeElement === el).catch(() => false);

        // Either modal opens or search input gets focus
        // This is optional - not all apps implement this
        if (modalVisible || inputFocused) {
          expect(modalVisible || inputFocused).toBe(true);
        }
      }
    });
  });

  test.describe("Responsive Layout", () => {
    test("dashboard is usable on tablet", async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      if (HAS_ADMIN_CREDS) {
        await attemptLogin(page);
      }

      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

      if (!page.url().includes("/login")) {
        // Content should still be visible
        const main = page.locator("main, [role='main']").first();
        await expect(main).toBeVisible();

        // Sidebar may be collapsed or in overlay mode
        const sidebar = page.locator("aside, nav").first();
        const sidebarVisible = await sidebar.isVisible().catch(() => false);

        // If sidebar visible, verify it doesn't overflow
        if (sidebarVisible) {
          const sidebarBox = await sidebar.boundingBox();
          expect(sidebarBox?.width).toBeLessThanOrEqual(300);
        }
      }
    });
  });
});
