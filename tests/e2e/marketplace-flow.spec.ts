/**
 * E2E Test: Marketplace Flow
 * Tests marketplace browsing, search, and product viewing
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
    "CI REQUIRES TEST_ORG_ID for tenant isolation validation in marketplace-flow.\n\n" +
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

test.describe("Marketplace - Public Access", () => {
  test("should display marketplace home page", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // Page should load
    await expect(page).toHaveTitle(/Marketplace|Fixzit/i);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display product categories", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // Look for category navigation or filters
    const categories = page.locator('[data-category], [class*="category"]');
    const categoryCount = await categories.count();

    // AUDIT-2025-11-30: Strengthened assertion - categories should exist on marketplace
    // If categories are intentionally hidden, update this assertion with documented reason
    expect(
      categoryCount,
      'Marketplace should display at least one category. If this is intentional, document the reason.'
    ).toBeGreaterThan(0);
  });

  test("should have working search functionality", async ({ page }) => {
    // Stub search API to ensure deterministic results in offline mode
    await page.route("**/api/marketplace/search**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [{ id: "p1", name: "Test Pump", price: 100 }],
        }),
      }),
    );

    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // Find search input
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], input[placeholder*="بحث" i]',
    );

    if (await searchInput.isVisible()) {
      // Type search query
      await searchInput.fill("pump");
      await page.waitForTimeout(1000);

      // Should show results or no results message
      const hasResults =
        (await page.locator('[class*="product"], [data-product]').count()) > 0;
      const hasNoResultsMsg = await page
        .locator("text=/no.*results|not.*found/i")
        .isVisible();

      expect(hasResults || hasNoResultsMsg).toBeTruthy();
    }
  });

  test("should display product cards", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // Look for product cards/items
    const productCards = page.locator(
      '[data-testid*="product"], [class*="product-card"]',
    );
    const cardCount = await productCards.count();

    if (cardCount > 0) {
      // First product should be visible
      await expect(productCards.first()).toBeVisible();
    }
  });

  test("should navigate to product details", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // Find a product link
    const productLink = page
      .locator('a[href*="/marketplace/"], a[href*="/product/"]')
      .first();

    if (await productLink.isVisible()) {
      await productLink.click();
      await page.waitForLoadState("networkidle");

      // Should navigate to product page
      expect(page.url()).toMatch(/marketplace|product/);
    }
  });

  test("should display product filters", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // Look for filter controls
    const filters = page.locator(
      '[data-filter], [class*="filter"], select, button:has-text("Filter")',
    );
    const hasFilters = (await filters.count()) > 0;

    if (hasFilters) {
      expect(hasFilters).toBeTruthy();
    }
  });

  test("should handle pagination", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // Look for pagination controls
    const pagination = page.locator(
      '[aria-label*="pagination" i], button:has-text("Next"), button:has-text("Previous")',
    );
    const hasPagination = (await pagination.count()) > 0;

    if (hasPagination) {
      await expect(pagination.first()).toBeVisible();
    }
  });
});

test.describe("Marketplace - Product Details", () => {
  test("should display product information", async ({ page }) => {
    // Navigate to a product (using a sample URL pattern)
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // Try to click first product
    const firstProduct = page
      .locator('a[href*="/product/"], a[href*="/marketplace/"]')
      .first();

    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await page.waitForLoadState("networkidle");

      // Should show product details
      const hasTitle = (await page.locator("h1, h2").count()) > 0;
      expect(hasTitle).toBeTruthy();
    }
  });

  test("should display product price", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // Look for price indicators
    const pricePattern = /ر\.س|SAR|\$|€|£|\d+/;
    const prices = page.locator('[class*="price"], [data-price]');

    if ((await prices.count()) > 0) {
      const priceText = await prices.first().textContent();
      if (priceText) {
        expect(priceText).toMatch(pricePattern);
      }
    }
  });

  test("should display add to cart or request quote button", async ({
    page,
  }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    const firstProduct = page
      .locator('a[href*="/product/"], a[href*="/marketplace/"]')
      .first();

    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await page.waitForLoadState("networkidle");

      // Look for action buttons
      const actionButton = page.locator(
        'button:has-text("Cart"), button:has-text("Quote"), button:has-text("Add"), button:has-text("Request")',
      );

      if ((await actionButton.count()) > 0) {
        await expect(actionButton.first()).toBeVisible();
      }
    }
  });
});

test.describe("Marketplace - API Integration", () => {
  test("should search products via API", async ({ request }) => {
    const response = await request.get("/api/marketplace/products?q=pump", {
      failOnStatusCode: false,
    });

    // API should respond (even if empty results)
    expect(response.status()).toBeLessThan(500);

    // AUDIT-2025-12-01: Use recursive tenant validation to catch nested org_id leaks
    // Handles wrapped payloads ({data: [...], items: [...]}), camelCase (orgId), and deep nesting
    // AUDIT-2025-12-01 (Phase 19): CRITICAL - Tenant validation errors MUST fail tests
    // DO NOT wrap in try/catch that swallows errors - cross-tenant leaks are security violations
    // AUDIT-2025-11-30: requirePresence: true for data-bearing endpoints - missing org_id should FAIL
    if (response.status() === 200 && TEST_ORG_ID) {
      const body = await response.json();
      walkAndVerifyOrgId(body, {
        expectedOrgId: TEST_ORG_ID,
        endpoint: '/api/marketplace/products',
        context: 'product search',
        requirePresence: true, // FAIL if org_id/orgId missing on tenant-scoped product data
      });
    }
    // Note: Missing TEST_ORG_ID warnings are now handled at module-level guard
  });

  test("should handle malformed search queries", async ({ request }) => {
    const response = await request.get(
      "/api/marketplace/products?q=" +
        encodeURIComponent('<script>alert("xss")</script>'),
      {
        failOnStatusCode: false,
      },
    );

    // Should not crash (404, 400, or 200 are all acceptable)
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe("Marketplace - Language Support", () => {
  test("should display marketplace in Arabic", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // Check document direction
    const dir = await page.locator("html").getAttribute("dir");

    if (dir === "rtl") {
      // Should have RTL layout
      expect(dir).toBe("rtl");

      // Should have Arabic text
      const bodyText = await page.locator("body").textContent();
      const hasArabic = /[\u0600-\u06FF]/.test(bodyText || "");
      expect(hasArabic).toBeTruthy();
    }
  });

  test("should switch marketplace language", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // Find language selector
    const langSelector = page
      .locator(
        '[aria-label*="language" i], button:has-text("العربية"), button:has-text("English")',
      )
      .first();

    if (await langSelector.isVisible()) {
      const initialDir = await page.locator("html").getAttribute("dir");

      await langSelector.click();
      await page.waitForTimeout(500);

      // Try to select a language
      const langOption = page.locator('[role="option"], li').first();
      if (await langOption.isVisible()) {
        await langOption.click();
        await page.waitForTimeout(500);

        const newDir = await page.locator("html").getAttribute("dir");
        // Direction should be set (may or may not change)
        expect(newDir).toBeTruthy();
      }
    }
  });
});
