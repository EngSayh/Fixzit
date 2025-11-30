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
import { verifyTenantScoping } from "./utils/tenant-validation";

const TEST_ORG_ID = process.env.TEST_ORG_ID;
const ALLOW_MISSING_TEST_ORG_ID = process.env.ALLOW_MISSING_TEST_ORG_ID === "true";
const IS_CI = process.env.CI === "true";
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

    // AUDIT-2025-12-01: Create/New CTA is critical for work order management workflow
    // Silent pass when create button is missing masks UX regressions. Fail-closed is safer.
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("New"), a[href*="work-orders/new"], ' +
      'button:has-text("إنشاء"), button:has-text("جديد")',
    );
    const createCount = await createButton.count();

    expect(
      createCount,
      'Work orders page should display a Create/New button or link. ' +
      'If creation is intentionally restricted, update this test with documented reason.'
    ).toBeGreaterThan(0);

    await expect(createButton.first()).toBeVisible();
    await createButton.first().click();
    await page.waitForLoadState("networkidle");

    // Should be on create page
    expect(
      page.url(),
      'Clicking Create should navigate to work order creation page'
    ).toContain("work-order");
  });

  test("should display work order filters", async ({ page }) => {
    await page.goto("/work-orders");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/login");

    // AUDIT-2025-12-01: Search/filter inputs are critical for work order management UX
    // Silent pass when search is missing masks UI regressions. Fail-closed is safer.
    const searchInput = page.locator(
      'input[placeholder*="search" i], input[placeholder*="بحث" i]',
    );
    const searchCount = await searchInput.count();

    expect(
      searchCount,
      'Work orders page should display at least one search/filter input. ' +
      'If search is intentionally removed, update this test with documented reason.'
    ).toBeGreaterThan(0);

    await expect(searchInput.first()).toBeVisible();
  });

  test("should display work order status options", async ({ page }) => {
    await page.goto("/work-orders");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/login");

    // AUDIT-2025-12-01: Status indicators are a critical UI element for work orders
    // If the page renders correctly, there should be at least one status indicator
    // (either in filters, cards, or status badges). Silent pass on 0 masks regressions.
    const statusElements = await page
      .locator('[class*="status"], [data-status]')
      .count();
    expect(
      statusElements,
      'Work orders page should display at least one status element (filter, badge, or card). ' +
      'If intentionally removed, update this test with documented reason.'
    ).toBeGreaterThan(0);
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

    const status = response.status();

    // AUDIT-2025-12-01 (Phase 21): Strict status allowlist for tenant validation
    // - 200: Data returned - MUST run tenant validation
    // - 401: Not authenticated - acceptable health check response, no data to validate
    // - 403/404/429/5xx: Unexpected - fail test to surface configuration/auth issues
    // Previous: toBeLessThan(500) allowed 403/404 to silently skip tenant validation
    const ALLOWED_STATUSES = [200, 401];
    expect(
      ALLOWED_STATUSES,
      `Work Orders API should return 200 (authenticated) or 401 (unauthenticated).\n` +
      `Got ${status} - unexpected response indicates configuration or permission issue.\n` +
      `If ${status} is now intentional, add it to ALLOWED_STATUSES with documentation.`
    ).toContain(status);

    // AUDIT-2025-12-01: Use shared verifyTenantScoping helper (fail-closed by default)
    // - Recursive validation catches nested/wrapped/camelCase org_id leaks
    // - requirePresence: true enforced via helper default
    // - DO NOT wrap in try/catch - tenant leaks are security violations
    if (status === 200) {
      if (TEST_ORG_ID) {
        const body = await response.json();
        verifyTenantScoping(body, TEST_ORG_ID, '/api/work-orders', 'work order list');
      }
    } else if (status === 401) {
      // Expected for unauthenticated requests - no tenant data to validate
      // Log for visibility but don't fail
      console.log('ℹ️  Work Orders API returned 401 (unauthenticated) - tenant validation skipped');
    }
    // Note: Missing TEST_ORG_ID warnings are now handled at module-level guard
  });
});
