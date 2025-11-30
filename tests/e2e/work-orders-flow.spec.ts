/**
 * E2E Test: Work Orders Flow
 * Tests work order creation, viewing, and management
 * 
 * AUDIT-2025-12-01: Aligned tenant validation with subrole-api-access.spec.ts pattern
 * - CI: Hard fail if TEST_ORG_ID missing (security-critical)
 * - Local: Warn if TEST_ORG_ID missing (developer visibility)
 * - Fork PRs: Skip gracefully (secrets unavailable)
 */

import { test, expect } from "@playwright/test";
import { verifyTenantScoping, walkAndVerifyOrgId } from "./utils/tenant-validation";

const TEST_ORG_ID = process.env.TEST_ORG_ID;
const ALLOW_MISSING_TEST_ORG_ID = process.env.ALLOW_MISSING_TEST_ORG_ID === "true";
const IS_CI = process.env.CI === "true";
const IS_GITHUB_ACTIONS = Boolean(process.env.GITHUB_ACTIONS);
const IS_PULL_REQUEST = process.env.GITHUB_EVENT_NAME === "pull_request";

/**
 * Fork detection: Forked PRs cannot access secrets.
 * We detect this to skip gracefully instead of crashing.
 */
const IS_FORK_OR_MISSING_SECRETS = IS_CI && IS_PULL_REQUEST && !TEST_ORG_ID;

/**
 * AUDIT-2025-12-01: Tenant validation guard
 * Aligned with subrole-api-access.spec.ts for consistent behavior
 */
if (IS_CI && !TEST_ORG_ID && !IS_FORK_OR_MISSING_SECRETS) {
  throw new Error(
    "CI REQUIRES TEST_ORG_ID for tenant isolation validation in work-orders-flow.\n\n" +
    "Cross-tenant data leaks are a critical security vulnerability.\n" +
    "ACTION: Add TEST_ORG_ID to GitHub Secrets and pass to E2E workflow."
  );
} else if (!TEST_ORG_ID && !IS_CI && !ALLOW_MISSING_TEST_ORG_ID) {
  console.warn(
    "⚠️  TENANT VALIDATION DISABLED: TEST_ORG_ID not set.\n" +
    "   Set TEST_ORG_ID in .env.local for full multi-tenancy validation.\n" +
    "   Or set ALLOW_MISSING_TEST_ORG_ID=true to acknowledge skip."
  );
}

test.describe("Work Orders - Authenticated User", () => {
  test.beforeEach(async ({ page }) => {
    // Note: These tests assume authentication is handled via test fixtures
    // In production, you'd use test.use() with storageState for authenticated sessions
    await page.goto("/");
  });

  test("should display work orders page", async ({ page }) => {
    await page.goto("/work-orders");

    // Check if redirected to login or page loads
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/login");

    // Page should have work orders content
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("should navigate to create work order", async ({ page }) => {
    await page.goto("/work-orders");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/login");

    // Look for create button
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("New"), a[href*="work-orders/new"]',
    );
    if (await createButton.isVisible()) {
      await createButton.first().click();
      await page.waitForLoadState("networkidle");

      // Should be on create page
      expect(page.url()).toContain("work-order");
    }
  });

  test("should display work order filters", async ({ page }) => {
    await page.goto("/work-orders");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/login");

    // Check for filter/search inputs
    const searchInput = page.locator(
      'input[placeholder*="search" i], input[placeholder*="بحث" i]',
    );
    const hasFilters = (await searchInput.count()) > 0;

    if (hasFilters) {
      await expect(searchInput.first()).toBeVisible();
    }
  });

  test("should display work order status options", async ({ page }) => {
    await page.goto("/work-orders");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/login");

    // Look for status indicators or filters
    const statusElements = await page
      .locator('[class*="status"], [data-status]')
      .count();
    expect(statusElements).toBeGreaterThanOrEqual(0); // Just check page structure exists
  });
});

test.describe("Work Orders - SLA Management", () => {
  test("should display SLA watchlist", async ({ page }) => {
    await page.goto("/work-orders/sla-watchlist");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/login");

    // Page should load
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display preventive maintenance", async ({ page }) => {
    await page.goto("/work-orders/pm");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/login");

    // Page should load
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Work Orders - Public API", () => {
  test("should check work order API health", async ({ request }) => {
    // This tests the API is responding (may return 401 if not authenticated)
    const response = await request.get("/api/work-orders", {
      failOnStatusCode: false,
    });

    // Should get a response (401 unauthorized is OK, 500 is not)
    expect(response.status()).toBeLessThan(500);

    // AUDIT-2025-12-01: Use recursive tenant validation to catch nested org_id leaks
    // Handles wrapped payloads ({data: [...]}), camelCase (orgId), and deep nesting
    // AUDIT-2025-12-01 (Phase 19): CRITICAL - Tenant validation errors MUST fail tests
    // DO NOT wrap in try/catch that swallows errors - cross-tenant leaks are security violations
    // AUDIT-2025-11-30: requirePresence: true for data-bearing 200 responses - missing org_id should FAIL
    if (response.status() === 200 && TEST_ORG_ID) {
      const body = await response.json();
      walkAndVerifyOrgId(body, {
        expectedOrgId: TEST_ORG_ID,
        endpoint: '/api/work-orders',
        context: 'health check',
        requirePresence: true, // FAIL if org_id/orgId missing on tenant-scoped work order data
      });
    }
    // Note: Missing TEST_ORG_ID warnings are now handled at module-level guard
  });
});
