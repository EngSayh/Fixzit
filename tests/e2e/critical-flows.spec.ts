import { test, expect } from "@playwright/test";
import { getRequiredTestCredentials, getTestOrgIdOptional, hasTestCredentials } from './utils/credentials';
import { attemptLogin } from './utils/auth';

/**
 * Critical User Flows E2E Tests
 * Tests core business functionality and user journeys
 * 
 * AUDIT-2025-12-01: Aligned with secure credential pattern from subrole-api-access.spec.ts
 * - CI: Hard fail if TEST_ADMIN credentials missing (security-critical)
 * - Local: Warn if credentials missing (developer visibility)
 * - Fork PRs: Skip gracefully (secrets unavailable)
 */

const TEST_ORG_ID = getTestOrgIdOptional();
const IS_CI = process.env.CI === 'true';
const IS_PULL_REQUEST = process.env.GITHUB_EVENT_NAME === 'pull_request';

/**
 * Fork detection: Forked PRs cannot access secrets.
 * We detect this to skip gracefully instead of crashing.
 */
const HAS_ADMIN_CREDENTIALS = hasTestCredentials('ADMIN');
const IS_FORK_OR_MISSING_SECRETS = IS_CI && IS_PULL_REQUEST && !HAS_ADMIN_CREDENTIALS;

/**
 * AUDIT-2025-12-01: Credential validation guard
 * Aligned with subrole-api-access.spec.ts for consistent behavior
 */
if (IS_CI && !HAS_ADMIN_CREDENTIALS && !IS_FORK_OR_MISSING_SECRETS) {
  throw new Error(
    "CI REQUIRES TEST_ADMIN_EMAIL/PASSWORD for critical-flows tests.\n\n" +
    "Tests using hardcoded fallback credentials mask real auth failures.\n" +
    "ACTION: Add TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to GitHub Secrets."
  );
} else if (!HAS_ADMIN_CREDENTIALS && !IS_CI) {
  console.warn(
    "⚠️  CRITICAL FLOWS: TEST_ADMIN_EMAIL/PASSWORD not set.\n" +
    "   Set credentials in .env.local for full test coverage.\n" +
    "   Tests will skip authentication steps."
  );
}

// AUDIT-2025-12-01: Skip all tests if running on fork without secrets
test.skip(
  IS_FORK_OR_MISSING_SECRETS,
  'Skipping critical-flows tests: forked PR or missing TEST_ADMIN credentials. ' +
  'Internal PRs require secrets configured in GitHub Actions.'
);

// Get credentials safely - will throw in CI if missing (after skip check)
let TEST_CREDENTIALS: { email: string; password: string } | null = null;
try {
  TEST_CREDENTIALS = HAS_ADMIN_CREDENTIALS ? getRequiredTestCredentials('ADMIN') : null;
} catch {
  // Already handled by skip and guard above
}

test.describe("Critical User Flows", () => {
  // AUDIT-2025-12-01: Use proper login flow instead of offline token injection
  // Offline tokens mask real auth failures and bypass RBAC validation
  test.beforeEach(async ({ page }) => {
    if (!TEST_CREDENTIALS) {
      // Skip to dashboard without auth - tests will handle auth-gated features gracefully
      await page.goto("/dashboard", { waitUntil: 'domcontentloaded' }).catch(() => {});
      return;
    }

    // Use shared attemptLogin helper for consistent auth behavior
    await page.goto("/login", { waitUntil: 'domcontentloaded' });
    const result = await attemptLogin(page, TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
    
    if (!result.success) {
      console.warn(
        `⚠️  Login failed for critical-flows: ${result.errorText}\n` +
        `   Tests may fail on auth-gated pages.`
      );
    }
  });

  test.describe("Work Orders", () => {
    test("should navigate to work orders page", async ({ page }) => {
      await page.click('a[href*="/work-orders"]');
      await expect(page).toHaveURL(/\/work-orders/);

      // Check page loaded
      await expect(page.locator("h1")).toContainText(/work orders/i);
    });

    test("should display work orders list", async ({ page }) => {
      await page.goto("/work-orders");

      // Wait for data to load
      await page.waitForSelector('[data-testid="work-orders-table"]', {
        timeout: 10000,
      });

      // Check table exists
      const table = page.locator('[data-testid="work-orders-table"]');
      await expect(table).toBeVisible();
    });

    test("should create new work order", async ({ page }) => {
      await page.goto("/work-orders");

      // Click create button
      await page.click('button:has-text("Create"), button:has-text("New")');

      // Fill work order form
      await page.fill('input[name="title"]', "Test Work Order E2E");
      await page.fill(
        'textarea[name="description"]',
        "Automated test work order",
      );

      // Select priority
      await page.click('[name="priority"]');
      await page.click("text=High");

      // Select category
      await page.click('[name="category"]');
      await page.click("text=Maintenance");

      // Submit form
      await page.click(
        'button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save")',
      );

      // Wait for success message
      await expect(page.locator("text=/created successfully/i")).toBeVisible({
        timeout: 10000,
      });

      // Verify redirected to work orders list or details
      await page.waitForURL(/\/work-orders/, { timeout: 5000 });
    });

    test("should filter work orders by status", async ({ page }) => {
      await page.goto("/work-orders");

      // Wait for table
      await page.waitForSelector('[data-testid="work-orders-table"]');

      // Click status filter
      await page.click('[data-testid="status-filter"]');
      await page.click("text=Open");

      // Wait for filtered results
      await page.waitForTimeout(1000);

      // Verify all visible work orders have "Open" status
      const statusBadges = await page
        .locator('[data-testid="status-badge"]')
        .allTextContents();
      statusBadges.forEach((status) => {
        expect(status).toContain("Open");
      });
    });

    test("should view work order details", async ({ page }) => {
      await page.goto("/work-orders");
      await page.waitForSelector('[data-testid="work-orders-table"]');

      // Click first work order
      await page.locator('[data-testid="work-order-row"]').first().click();

      // Should navigate to details page
      await expect(page).toHaveURL(/\/work-orders\/[a-zA-Z0-9-]+/);

      // Check details are visible
      await expect(
        page.locator('[data-testid="work-order-title"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="work-order-description"]'),
      ).toBeVisible();
    });

    test("should update work order status", async ({ page }) => {
      await page.goto("/work-orders");
      await page.waitForSelector('[data-testid="work-orders-table"]');

      // Click first work order
      await page.locator('[data-testid="work-order-row"]').first().click();

      // Click status dropdown
      await page.click('[data-testid="status-select"]');
      await page.click("text=In Progress");

      // Wait for update
      await expect(page.locator("text=/updated successfully/i")).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe("Properties", () => {
    test("should navigate to properties page", async ({ page }) => {
      await page.click('a[href*="/properties"]');
      await expect(page).toHaveURL(/\/properties/);
    });

    test("should display properties list", async ({ page }) => {
      await page.goto("/properties");

      // Wait for properties to load
      await page.waitForSelector(
        '[data-testid="properties-grid"], [data-testid="properties-list"]',
        { timeout: 10000 },
      );

      // Check properties are visible
      const properties = page.locator('[data-testid="property-card"]');
      await expect(properties.first()).toBeVisible();
    });

    test("should create new property", async ({ page }) => {
      await page.goto("/properties");

      // Click create button
      await page.click(
        'button:has-text("Add Property"), button:has-text("Create")',
      );

      // Fill property form
      await page.fill('input[name="name"]', "Test Property E2E");
      await page.fill('input[name="address"]', "123 Test Street");
      await page.fill('input[name="city"]', "Riyadh");

      // Submit
      await page.click('button[type="submit"]');

      // Wait for success
      await expect(page.locator("text=/created successfully/i")).toBeVisible({
        timeout: 10000,
      });
    });

    test("should view property details", async ({ page }) => {
      await page.goto("/properties");
      await page.waitForSelector('[data-testid="property-card"]');

      // Click first property
      await page.locator('[data-testid="property-card"]').first().click();

      // Should navigate to details
      await expect(page).toHaveURL(/\/properties\/[a-zA-Z0-9-]+/);

      // Check details visible
      await expect(page.locator('[data-testid="property-name"]')).toBeVisible();
    });

    test("should link asset to property", async ({ page }) => {
      await page.goto("/properties");
      await page.waitForSelector('[data-testid="property-card"]');

      // Click first property
      await page.locator('[data-testid="property-card"]').first().click();

      // Click add asset button
      await page.click('button:has-text("Add Asset")');

      // Fill asset form
      await page.fill('input[name="assetName"]', "Test Asset E2E");
      await page.fill('input[name="assetType"]', "HVAC");

      // Submit
      await page.click('button[type="submit"]');

      // Wait for success
      await expect(page.locator("text=/asset added/i")).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe("Marketplace", () => {
    test("should browse marketplace", async ({ page }) => {
      await page.goto("/marketplace");

      // Wait for products to load
      await page.waitForSelector('[data-testid="product-card"]', {
        timeout: 10000,
      });

      // Check products are visible
      const products = page.locator('[data-testid="product-card"]');
      await expect(products.first()).toBeVisible();
    });

    test("should search for products", async ({ page }) => {
      await page.goto("/marketplace");

      // Enter search query
      await page.fill('input[placeholder*="Search"]', "air conditioner");
      await page.press('input[placeholder*="Search"]', "Enter");

      // Wait for search results
      await page.waitForTimeout(1000);

      // Check results contain search term
      const productTitles = await page
        .locator('[data-testid="product-title"]')
        .allTextContents();
      expect(
        productTitles.some((title) => title.toLowerCase().includes("air")),
      ).toBe(true);
    });

    test("should add product to cart", async ({ page }) => {
      await page.goto("/marketplace");
      await page.waitForSelector('[data-testid="product-card"]');

      // Click first product
      await page.locator('[data-testid="product-card"]').first().click();

      // Click add to cart
      await page.click('button:has-text("Add to Cart")');

      // Check cart badge updated
      const cartBadge = page.locator('[data-testid="cart-badge"]');
      await expect(cartBadge).toBeVisible();

      // Success message
      await expect(page.locator("text=/added to cart/i")).toBeVisible({
        timeout: 5000,
      });
    });

    test("should complete checkout flow", async ({ page }) => {
      // Add product to cart first
      await page.goto("/marketplace");
      await page.waitForSelector('[data-testid="product-card"]');
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');

      // Navigate to cart
      await page.click('[data-testid="cart-icon"]');
      await expect(page).toHaveURL(/\/marketplace\/cart/);

      // Proceed to checkout
      await page.click(
        'button:has-text("Checkout"), button:has-text("Proceed")',
      );
      await expect(page).toHaveURL(/\/marketplace\/checkout/);

      // Fill shipping info
      await page.fill('input[name="shippingAddress"]', "123 Test St, Riyadh");
      await page.fill('input[name="phone"]', "+966500000000");

      // Select payment method
      await page.click('[data-testid="payment-method-card"]');

      // Submit order (don't actually process payment in test)
      await page.click('button:has-text("Place Order")');

      // Wait for confirmation
      await expect(
        page.locator("text=/order placed|order confirmed/i"),
      ).toBeVisible({ timeout: 15000 });
    });

    test("should view order history", async ({ page }) => {
      await page.goto("/marketplace/orders");

      // Wait for orders to load
      await page.waitForSelector('[data-testid="order-list"]', {
        timeout: 10000,
      });

      // Check orders table visible
      const ordersTable = page.locator('[data-testid="order-list"]');
      await expect(ordersTable).toBeVisible();
    });
  });

  test.describe("Documents", () => {
    test("should upload document", async ({ page }) => {
      await page.goto("/work-orders");
      await page.waitForSelector('[data-testid="work-order-row"]');

      // Click first work order
      await page.locator('[data-testid="work-order-row"]').first().click();

      // Click upload button
      await page.click('button:has-text("Upload"), button:has-text("Attach")');

      // Upload file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: "test-document.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("PDF test content"),
      });

      // Wait for upload to complete
      await expect(page.locator("text=/uploaded successfully/i")).toBeVisible({
        timeout: 15000,
      });
    });

    test("should preview document", async ({ page }) => {
      await page.goto("/work-orders");
      await page.waitForSelector('[data-testid="work-order-row"]');

      // Click first work order
      await page.locator('[data-testid="work-order-row"]').first().click();

      // Find and click first document
      const documentLink = page
        .locator('[data-testid="document-link"]')
        .first();
      if (await documentLink.isVisible()) {
        await documentLink.click();

        // Check preview modal or new tab opened
        await expect(
          page.locator('[data-testid="document-preview"]'),
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test("should download document", async ({ page }) => {
      await page.goto("/work-orders");
      await page.waitForSelector('[data-testid="work-order-row"]');

      // Click first work order
      await page.locator('[data-testid="work-order-row"]').first().click();

      // Click download button
      const downloadPromise = page.waitForEvent("download");
      await page.locator('[data-testid="document-download"]').first().click();

      // Wait for download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBeTruthy();
    });
  });

  test.describe("Reports", () => {
    test("should navigate to reports page", async ({ page }) => {
      await page.goto("/reports");

      // Check page loaded
      await expect(page.locator("h1")).toContainText(/reports/i);
    });

    test("should generate work orders report", async ({ page }) => {
      await page.goto("/reports");

      // Select report type
      await page.click('[data-testid="report-type-select"]');
      await page.click("text=Work Orders");

      // Select date range
      await page.click('[data-testid="date-range-picker"]');
      await page.click("text=Last 30 Days");

      // Generate report
      await page.click(
        'button:has-text("Generate"), button:has-text("Create Report")',
      );

      // Wait for report to generate
      await expect(page.locator('[data-testid="report-preview"]')).toBeVisible({
        timeout: 15000,
      });
    });

    test("should export report to PDF", async ({ page }) => {
      await page.goto("/reports");

      // Generate report first
      await page.click('[data-testid="report-type-select"]');
      await page.click("text=Work Orders");
      await page.click('button:has-text("Generate")');
      await page.waitForSelector('[data-testid="report-preview"]', {
        timeout: 15000,
      });

      // Export to PDF
      const downloadPromise = page.waitForEvent("download");
      await page.click(
        'button:has-text("Export PDF"), button:has-text("Download PDF")',
      );

      // Wait for download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    });

    test("should export report to Excel", async ({ page }) => {
      await page.goto("/reports");

      // Generate report first
      await page.click('[data-testid="report-type-select"]');
      await page.click("text=Work Orders");
      await page.click('button:has-text("Generate")');
      await page.waitForSelector('[data-testid="report-preview"]', {
        timeout: 15000,
      });

      // Export to Excel
      const downloadPromise = page.waitForEvent("download");
      await page.click(
        'button:has-text("Export Excel"), button:has-text("Download Excel")',
      );

      // Wait for download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
    });
  });

  test.describe("Notifications", () => {
    test("should display notifications panel", async ({ page }) => {
      await page.goto("/dashboard");

      // Click notifications icon
      await page.click('[data-testid="notifications-button"]');

      // Check panel opens
      await expect(
        page.locator('[data-testid="notifications-panel"]'),
      ).toBeVisible();
    });

    test("should mark notification as read", async ({ page }) => {
      await page.goto("/dashboard");

      // Open notifications
      await page.click('[data-testid="notifications-button"]');

      // Find unread notification
      const unreadNotification = page
        .locator('[data-testid="notification-unread"]')
        .first();
      if (await unreadNotification.isVisible()) {
        // Click notification
        await unreadNotification.click();

        // Check marked as read (badge removed)
        await expect(
          unreadNotification.locator('[data-testid="unread-badge"]'),
        ).not.toBeVisible();
      }
    });

    test("should navigate to notification target", async ({ page }) => {
      await page.goto("/dashboard");

      // Open notifications
      await page.click('[data-testid="notifications-button"]');

      // Click first notification
      const firstNotification = page
        .locator('[data-testid="notification-item"]')
        .first();
      await firstNotification.click();

      // Should navigate to related page
      await page.waitForURL(/\/(work-orders|properties|marketplace)/, {
        timeout: 5000,
      });
    });
  });

  test.describe("User Profile", () => {
    test("should view user profile", async ({ page }) => {
      await page.goto("/profile");

      // Check profile page loaded
      await expect(page.locator("h1")).toContainText(/profile/i);

      // Check user info visible
      await expect(page.locator('[data-testid="user-email"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
    });

    test("should update profile information", async ({ page }) => {
      await page.goto("/profile");

      // Click edit button
      await page.click(
        'button:has-text("Edit Profile"), button:has-text("Edit")',
      );

      // Update name
      await page.fill('input[name="name"]', "Updated Name E2E");

      // Save
      await page.click('button[type="submit"]:has-text("Save")');

      // Wait for success
      await expect(page.locator("text=/updated successfully/i")).toBeVisible({
        timeout: 10000,
      });
    });

    test("should change password", async ({ page }) => {
      // AUDIT-2025-12-01: Skip if no credentials available
      test.skip(!TEST_CREDENTIALS, 'Requires TEST_ADMIN credentials for password change test');
      
      await page.goto("/profile");

      // Navigate to security tab
      await page.click('button:has-text("Security"), a:has-text("Security")');

      // Fill password form
      await page.fill('input[name="currentPassword"]', TEST_CREDENTIALS!.password);
      await page.fill('input[name="newPassword"]', "NewPassword123!");
      await page.fill('input[name="confirmPassword"]', "NewPassword123!");

      // Submit
      await page.click('button:has-text("Change Password")');

      // Wait for success
      await expect(page.locator("text=/password changed/i")).toBeVisible({
        timeout: 10000,
      });

      // Note: In real test, should revert password back
    });
  });

  test.describe("Search", () => {
    test("should search across modules", async ({ page }) => {
      await page.goto("/dashboard");

      // Click global search
      await page.click('[data-testid="global-search"]');

      // Type search query
      await page.fill('input[placeholder*="Search"]', "maintenance");
      await page.press('input[placeholder*="Search"]', "Enter");

      // Wait for results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible({
        timeout: 5000,
      });

      // Check results contain query
      const results = await page
        .locator('[data-testid="search-result-item"]')
        .allTextContents();
      expect(
        results.some((result) => result.toLowerCase().includes("maintenance")),
      ).toBe(true);
    });
  });

  test.describe("Language Toggle", () => {
    test("should switch to Arabic", async ({ page }) => {
      await page.goto("/dashboard");

      // Click language selector
      await page.click('[data-testid="language-selector"]');
      await page.click("text=العربية");

      // Wait for page reload
      await page.waitForTimeout(1000);

      // Check RTL direction
      const body = page.locator("body");
      await expect(body).toHaveAttribute("dir", "rtl");

      // Check Arabic text visible
      await expect(page.locator("text=/لوحة التحكم/")).toBeVisible();
    });

    test("should persist language preference", async ({ page }) => {
      // Switch to Arabic
      await page.goto("/dashboard");
      await page.click('[data-testid="language-selector"]');
      await page.click("text=العربية");
      await page.waitForTimeout(1000);

      // Reload page
      await page.reload();

      // Should still be Arabic
      const body = page.locator("body");
      await expect(body).toHaveAttribute("dir", "rtl");
    });
  });
});
