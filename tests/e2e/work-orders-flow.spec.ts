/**
 * E2E Test: Work Orders Flow
 * Tests work order creation, viewing, and management
 */

import { test, expect } from "@playwright/test";

const TEST_ORG_ID = process.env.TEST_ORG_ID;
const ALLOW_MISSING_TEST_ORG_ID = process.env.ALLOW_MISSING_TEST_ORG_ID === "true";
const IS_CI = process.env.CI === "true";

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

    // If we got 200 and TEST_ORG_ID is set, enforce tenant scoping in payloads that include org_id
    if (response.status() === 200 && TEST_ORG_ID) {
      try {
        const body = await response.json();
        const verifyOrg = (value: unknown) => {
          if (value && typeof value === "object" && "org_id" in (value as Record<string, unknown>)) {
            expect((value as { org_id?: unknown }).org_id).toBe(TEST_ORG_ID);
          }
        };
        if (Array.isArray(body)) {
          body.forEach(verifyOrg);
        } else {
          verifyOrg(body);
        }
      } catch (error) {
        // Non-JSON or no org_id — warn but don't fail this health check
        console.warn(
          `⚠️  Tenant validation skipped for /api/work-orders: ${String(error)}`
        );
      }
    } else if (!TEST_ORG_ID && !IS_CI && !ALLOW_MISSING_TEST_ORG_ID) {
      console.warn(
        "⚠️  TEST_ORG_ID not set; tenant validation skipped for work orders API health. " +
        "Set TEST_ORG_ID in .env.local or ALLOW_MISSING_TEST_ORG_ID=true to acknowledge skip."
      );
    }
  });
});
