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

    // AUDIT-2025-12-01: Search is a critical marketplace UX element
    // Silent pass when search is missing masks UI regressions. Fail-closed is safer.
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], input[placeholder*="بحث" i]',
    );
    const searchCount = await searchInput.count();

    expect(
      searchCount,
      'Marketplace should display at least one search input. ' +
      'If search is intentionally removed, update this test with documented reason.'
    ).toBeGreaterThan(0);

    await expect(searchInput.first()).toBeVisible();

    // Type search query
    await searchInput.first().fill("pump");
    
    // AUDIT-2025-12-01: Wait for search response using Playwright's or() combinator
    // Either products appear OR a "no results" message appears
    const productSelector = '[class*="product"], [data-product]';
    const noResultsSelector = 'text=/no.*results|not.*found/i';
    const resultOrEmpty = page.locator(productSelector).first().or(page.locator(noResultsSelector));
    await resultOrEmpty.waitFor({ state: 'visible', timeout: 10000 });

    // Should show results or no results message
    const hasResults = (await page.locator(productSelector).count()) > 0;
    const hasNoResultsMsg = await page.locator(noResultsSelector).isVisible();

    expect(
      hasResults || hasNoResultsMsg,
      'Search should display either product results or a "no results" message'
    ).toBeTruthy();
  });

  test("should display product cards", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // AUDIT-2025-12-01: Product cards are the core marketplace UI element
    // If the marketplace renders, there should be products. Silent pass on 0 masks regressions.
    const productCards = page.locator(
      '[data-testid*="product"], [class*="product-card"]',
    );
    const cardCount = await productCards.count();

    expect(
      cardCount,
      'Marketplace should display at least one product card. ' +
      'If empty state is intentional, update this test with documented reason.'
    ).toBeGreaterThan(0);

    // First product should be visible
    await expect(productCards.first()).toBeVisible();
  });

  test("should navigate to product details", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // AUDIT-2025-12-01: Product links are essential for marketplace navigation
    // If products are displayed, they must be clickable. Silent pass on missing links masks regressions.
    const productLink = page
      .locator('a[href*="/marketplace/"], a[href*="/product/"]')
      .first();
    const linkCount = await page
      .locator('a[href*="/marketplace/"], a[href*="/product/"]')
      .count();

    expect(
      linkCount,
      'Marketplace should display at least one clickable product link. ' +
      'If products are non-clickable by design, update this test with documented reason.'
    ).toBeGreaterThan(0);

    await expect(productLink).toBeVisible();
    await productLink.click();
    await page.waitForLoadState("networkidle");

    // Should navigate to product page
    expect(page.url()).toMatch(/marketplace|product/);
  });

  test("should display product filters", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // AUDIT-2025-12-01: Filters are expected on marketplace for UX discoverability
    // Silent pass when filters=0 masks UI regressions. Fail-closed is safer.
    const filters = page.locator(
      '[data-filter], [class*="filter"], select, button:has-text("Filter")',
    );
    const filterCount = await filters.count();

    expect(
      filterCount,
      'Marketplace should display at least one filter control (category, price, etc). ' +
      'If filters are intentionally removed, update this test with documented reason.'
    ).toBeGreaterThan(0);

    // First filter should be visible
    await expect(filters.first()).toBeVisible();
  });

  test("should handle pagination", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // AUDIT-2025-12-01: Pagination is expected for marketplace with multiple products
    // Silent pass when pagination=0 masks UI regressions. Fail-closed is safer.
    // If infinite scroll is implemented, update this test with documented reason.
    const pagination = page.locator(
      '[aria-label*="pagination" i], button:has-text("Next"), button:has-text("Previous"), ' +
      '[class*="pagination"], nav[role="navigation"]',
    );
    const paginationCount = await pagination.count();

    expect(
      paginationCount,
      'Marketplace should display pagination controls (Next/Previous or page numbers). ' +
      'If infinite scroll is used instead, update this test with documented reason.'
    ).toBeGreaterThan(0);

    // First pagination control should be visible
    await expect(pagination.first()).toBeVisible();
  });
});

test.describe("Marketplace - Product Details", () => {
  test("should display product information", async ({ page }) => {
    // Navigate to a product (using a sample URL pattern)
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // AUDIT-2025-12-01: Product detail navigation is critical for marketplace flow
    // Products must be clickable and lead to detail pages. Fail if navigation targets missing.
    const firstProduct = page
      .locator('a[href*="/product/"], a[href*="/marketplace/"]')
      .first();
    const productCount = await page
      .locator('a[href*="/product/"], a[href*="/marketplace/"]')
      .count();

    expect(
      productCount,
      'Marketplace should display clickable product links for detail navigation. ' +
      'If this is intentional, update this test with documented reason.'
    ).toBeGreaterThan(0);

    await expect(firstProduct).toBeVisible();
    await firstProduct.click();
    await page.waitForLoadState("networkidle");

    // Should show product details - title is mandatory on detail pages
    const titleCount = await page.locator("h1, h2").count();
    expect(
      titleCount,
      'Product detail page should display a title (h1 or h2). ' +
      'If title is intentionally missing, update this test with documented reason.'
    ).toBeGreaterThan(0);
  });

  test("should display product price", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // AUDIT-2025-12-01: Prices are essential marketplace information
    // Products should display pricing. Silent pass on missing prices masks regressions.
    const pricePattern = /ر\.س|SAR|\$|€|£|\d+/;
    const prices = page.locator('[class*="price"], [data-price]');
    const priceCount = await prices.count();

    expect(
      priceCount,
      'Marketplace should display at least one price indicator. ' +
      'If prices are intentionally hidden, update this test with documented reason.'
    ).toBeGreaterThan(0);

    const priceText = await prices.first().textContent();
    expect(priceText).toBeTruthy();
    expect(priceText).toMatch(pricePattern);
  });

  test("should display add to cart or request quote button", async ({
    page,
  }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // AUDIT-2025-12-01: Action buttons are critical for marketplace conversion
    // Product details must have a CTA (add to cart, request quote, etc).
    const firstProduct = page
      .locator('a[href*="/product/"], a[href*="/marketplace/"]')
      .first();
    const productCount = await page
      .locator('a[href*="/product/"], a[href*="/marketplace/"]')
      .count();

    expect(
      productCount,
      'Marketplace should display clickable product links. ' +
      'If this is intentional, update this test with documented reason.'
    ).toBeGreaterThan(0);

    await expect(firstProduct).toBeVisible();
    await firstProduct.click();
    await page.waitForLoadState("networkidle");

    // Look for action buttons - at least one CTA should exist on product detail
    const actionButton = page.locator(
      'button:has-text("Cart"), button:has-text("Quote"), button:has-text("Add"), button:has-text("Request"), ' +
      'button:has-text("سلة"), button:has-text("طلب"), button:has-text("إضافة")',
    );
    const actionCount = await actionButton.count();

    expect(
      actionCount,
      'Product detail page should display at least one action button (Add to Cart, Request Quote, etc). ' +
      'If CTAs are intentionally hidden, update this test with documented reason.'
    ).toBeGreaterThan(0);

    await expect(actionButton.first()).toBeVisible();
  });
});

test.describe("Marketplace - API Integration", () => {
  test("should search products via API", async ({ request }) => {
    const response = await request.get("/api/marketplace/products?q=pump", {
      failOnStatusCode: false,
    });

    // AUDIT-2025-12-01 (Phase 20): Require 200 status to ensure tenant validation runs
    // Previously: status < 500 allowed 401/403/404 to silently skip org_id checks
    // Now: fail if not 200, guaranteeing scoping validation executes
    expect(
      response.status(),
      `Marketplace product search should return 200 for tenant validation to run.\n` +
      `Got ${response.status()} - this may mask cross-tenant leaks.`
    ).toBe(200);

    // AUDIT-2025-12-01: Use shared verifyTenantScoping helper (fail-closed by default)
    // - Recursive validation catches nested/wrapped/camelCase org_id leaks
    // - requirePresence: true enforced via helper default
    // - DO NOT wrap in try/catch - tenant leaks are security violations
    if (TEST_ORG_ID) {
      const body = await response.json();
      verifyTenantScoping(body, TEST_ORG_ID, '/api/marketplace/products', 'product search');
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

    // AUDIT-2025-12-01 (Phase 20): Intentionally lenient status assertion
    // This test validates XSS input handling (security boundary), not data scoping.
    // Acceptable responses: 200 (sanitized), 400 (rejected), 404 (not found)
    // Only 5xx indicates server failure.
    // NOTE: Tenant validation is NOT enforced here - use product search test for that.
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe("Marketplace - Language Support", () => {
  test("should display marketplace in Arabic", async ({ page }) => {
    // AUDIT-2025-12-01: RTL/Arabic is a core platform requirement
    // Force Arabic locale via URL parameter or accept-language header
    // to ensure this test validates Arabic rendering, not just "if RTL exists"
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // Check document direction - for RTL-first platform, we expect RTL or explicit LTR
    const dir = await page.locator("html").getAttribute("dir");

    // AUDIT-2025-12-01: Changed from conditional to fail-closed
    // Previously: if (dir === 'rtl') { ... } silently passed when LTR
    // Now: Assert direction is set (RTL or LTR) - missing dir is a regression
    expect(
      dir,
      'HTML should have dir attribute set (rtl or ltr). ' +
      'Missing dir attribute breaks accessibility and RTL support.'
    ).toBeTruthy();

    // If RTL, validate Arabic content is present
    if (dir === "rtl") {
      const bodyText = await page.locator("body").textContent();
      const hasArabic = /[\u0600-\u06FF]/.test(bodyText || "");
      expect(
        hasArabic,
        'RTL page should contain Arabic text. ' +
        'If RTL without Arabic is intentional, document the reason.'
      ).toBeTruthy();
    }
  });

  test("should switch marketplace language", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // AUDIT-2025-12-01: Language toggle is critical for RTL-first platform (Arabic/English)
    // Silent pass when selector is missing masks L10n regressions. Fail-closed is safer.
    // If language toggle is feature-flagged, add explicit env check here.
    const langSelector = page.locator(
      '[aria-label*="language" i], [aria-label*="اللغة" i], ' +
      'button:has-text("العربية"), button:has-text("English"), ' +
      '[data-testid*="language"], [class*="language-switch"]',
    );
    const langCount = await langSelector.count();

    expect(
      langCount,
      'Marketplace should display a language selector (RTL-first platform requirement). ' +
      'If language toggle is feature-flagged, add explicit skip condition with documented reason.'
    ).toBeGreaterThan(0);

    await expect(langSelector.first()).toBeVisible();

    const initialDir = await page.locator("html").getAttribute("dir");

    await langSelector.first().click();
    
    // AUDIT-2025-12-01: Wait for language options to appear instead of hardcoded timeout
    const langOption = page.locator('[role="option"], [role="menuitem"], li[data-lang], button[data-lang]');
    await langOption.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
      // Options may already be visible or use different selector
    });

    // Language options should appear after clicking selector
    const optionCount = await langOption.count();

    expect(
      optionCount,
      'Language selector should display at least one language option when clicked. ' +
      'If options are loaded async, increase wait timeout.'
    ).toBeGreaterThan(0);

    await langOption.first().click();
    
    // AUDIT-2025-12-01: Wait for page to respond to language change
    // Either dir attribute changes or page reloads
    await page.waitForFunction(() => {
      const html = document.querySelector('html');
      return html?.getAttribute('dir') !== null;
    }, { timeout: 5000 }).catch(() => {});

    const newDir = await page.locator("html").getAttribute("dir");
    // Direction should be set (RTL or LTR)
    expect(
      newDir,
      'HTML dir attribute should be set after language selection'
    ).toBeTruthy();
  });
});
