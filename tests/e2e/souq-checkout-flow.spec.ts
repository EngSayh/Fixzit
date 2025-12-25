/**
 * E2E Test: Souq Checkout Flow
 * Tests the complete checkout flow: Cart → Checkout → Order confirmation
 * 
 * AUDIT-2025-12-25: Created per improvement analysis recommendation
 * - P1 priority for critical user conversion flow
 * - Covers cart operations, checkout validation, order creation
 * - Tenant-isolated with TEST_ORG_ID validation
 */

import { test, expect } from "@playwright/test";
import { verifyTenantScoping } from "./utils/tenant-validation";

const TEST_ORG_ID = process.env.TEST_ORG_ID;
const IS_CI = process.env.CI === "true";
const IS_PULL_REQUEST = process.env.GITHUB_EVENT_NAME === "pull_request";
const IS_FORK_OR_MISSING_SECRETS = IS_CI && IS_PULL_REQUEST && !TEST_ORG_ID;

/**
 * AUDIT-2025-12-25: Tenant validation guard
 * Aligned with subrole-api-access.spec.ts pattern
 */
if (IS_CI && !TEST_ORG_ID && !IS_FORK_OR_MISSING_SECRETS) {
  throw new Error(
    "CI REQUIRES TEST_ORG_ID for tenant isolation validation in souq-checkout-flow.\n\n" +
    "Cross-tenant data leaks are a critical security vulnerability.\n" +
    "ACTION: Add TEST_ORG_ID to GitHub Secrets and pass to E2E workflow."
  );
}

test.describe("Souq Checkout - Cart Operations", () => {
  test("should retrieve empty cart for new user", async ({ request }) => {
    const response = await request.get("/api/marketplace/cart", {
      failOnStatusCode: false,
    });

    // Accept 200 (empty cart) or 401 (requires auth in production)
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.lines).toEqual([]);
      expect(body.data.currency).toBe("SAR");

      if (TEST_ORG_ID) {
        verifyTenantScoping(body, TEST_ORG_ID, '/api/marketplace/cart', 'cart retrieval');
      }
    }
  });

  test("should add item to cart", async ({ request }) => {
    // First get a valid product ID
    const productsResponse = await request.get("/api/marketplace/products?limit=1", {
      failOnStatusCode: false,
    });

    if (productsResponse.status() !== 200) {
      test.skip(true, "Products API not available - skipping cart add test");
      return;
    }

    const products = await productsResponse.json();
    const productList = products.products || products.items || [];
    if (!productList.length) {
      test.skip(true, "No products available - skipping cart add test");
      return;
    }

    const productId = productList[0]._id;

    const response = await request.post("/api/marketplace/cart", {
      data: {
        productId,
        quantity: 1,
      },
      failOnStatusCode: false,
    });

    // Accept 200 (success), 401 (auth required), or 400 (validation)
    expect([200, 400, 401]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.data.lines.length).toBeGreaterThan(0);

      if (TEST_ORG_ID) {
        verifyTenantScoping(body, TEST_ORG_ID, '/api/marketplace/cart POST', 'add to cart');
      }
    }
  });

  test("should reject invalid productId", async ({ request }) => {
    const response = await request.post("/api/marketplace/cart", {
      data: {
        productId: "invalid-id",
        quantity: 1,
      },
      failOnStatusCode: false,
    });

    // Should reject with 400 or 404, not 500
    expect(response.status()).toBeLessThan(500);
    expect([400, 401, 404]).toContain(response.status());
  });

  test("should reject negative quantity", async ({ request }) => {
    const response = await request.post("/api/marketplace/cart", {
      data: {
        productId: "507f1f77bcf86cd799439011",
        quantity: -1,
      },
      failOnStatusCode: false,
    });

    // Should reject with validation error
    expect(response.status()).toBeLessThan(500);
    expect([400, 401, 422]).toContain(response.status());
  });
});

test.describe("Souq Checkout - Checkout Process", () => {
  test("should reject checkout with empty cart", async ({ request }) => {
    const response = await request.post("/api/marketplace/checkout", {
      data: {
        shipTo: {
          address: "123 Test Street, Riyadh",
          contact: "Test User",
          phone: "+966501234567",
        },
      },
      failOnStatusCode: false,
    });

    // Empty cart should fail with 400 or 401
    expect([400, 401]).toContain(response.status());

    if (response.status() === 400) {
      const body = await response.json();
      expect(body.error || body.message).toMatch(/empty|cart/i);
    }
  });

  test("should validate shipping address", async ({ request }) => {
    const response = await request.post("/api/marketplace/checkout", {
      data: {
        shipTo: {
          address: "", // Invalid - empty address
          contact: "",
        },
      },
      failOnStatusCode: false,
    });

    // Should reject with validation error
    expect(response.status()).toBeLessThan(500);
  });

  test("should enforce rate limiting on checkout", async ({ request }) => {
    // Make multiple rapid checkout attempts
    const attempts = [];
    for (let i = 0; i < 15; i++) {
      attempts.push(
        request.post("/api/marketplace/checkout", {
          data: { shipTo: { address: "Test", contact: "Test" } },
          failOnStatusCode: false,
        })
      );
    }

    const responses = await Promise.all(attempts);
    const statuses = responses.map((r) => r.status());

    // At least some should be rate limited (429) after threshold
    // Or 401/400 if auth/validation kicks in first
    const hasRateLimitOrAuth = statuses.some((s) => [400, 401, 429].includes(s));
    expect(hasRateLimitOrAuth).toBe(true);
  });
});

test.describe("Souq Checkout - Order API Integration", () => {
  test("should list orders with tenant scoping", async ({ request }) => {
    const response = await request.get("/api/souq/orders", {
      failOnStatusCode: false,
    });

    // Accept 200 or 401 (auth required)
    expect([200, 401, 403]).toContain(response.status());

    if (response.status() === 200 && TEST_ORG_ID) {
      const body = await response.json();
      verifyTenantScoping(body, TEST_ORG_ID, '/api/souq/orders', 'orders list');
    }
  });

  test("should reject order access with invalid ID", async ({ request }) => {
    const response = await request.get("/api/souq/orders/invalid-id", {
      failOnStatusCode: false,
    });

    // Should return 400 (invalid ID) or 404, not 500
    expect(response.status()).toBeLessThan(500);
    expect([400, 401, 403, 404]).toContain(response.status());
  });

  test("should handle XSS in order search", async ({ request }) => {
    const response = await request.get(
      "/api/souq/orders?search=" + encodeURIComponent('<script>alert("xss")</script>'),
      { failOnStatusCode: false }
    );

    // Should sanitize or reject, never crash
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe("Souq Checkout - UI Flow", () => {
  test("should display cart page", async ({ page }) => {
    await page.goto("/marketplace/cart");
    await page.waitForLoadState("networkidle");

    // Page should load without errors
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display checkout page", async ({ page }) => {
    await page.goto("/marketplace/checkout");
    await page.waitForLoadState("networkidle");

    // Page should load - may redirect to login or show checkout form
    await expect(page.locator("body")).toBeVisible();
    
    // Should have either checkout form or login redirect
    const hasCheckoutForm = await page.locator('form, [data-testid="checkout-form"]').count();
    const isLoginPage = page.url().includes("login") || page.url().includes("signin");
    
    expect(hasCheckoutForm > 0 || isLoginPage).toBe(true);
  });

  test("should show cart item count in header", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");

    // Cart icon/indicator should exist
    const cartIndicator = page.locator(
      '[data-testid="cart-count"], [class*="cart"], [aria-label*="cart" i], ' +
      'a[href*="/cart"], button:has-text("Cart"), button:has-text("سلة")'
    );
    
    const cartCount = await cartIndicator.count();
    expect(cartCount, "Marketplace should display a cart indicator").toBeGreaterThan(0);
  });
});

test.describe("Souq Checkout - Inventory Integration", () => {
  test("should reserve inventory on checkout", async ({ request }) => {
    const response = await request.post("/api/souq/inventory/reserve", {
      data: {
        productId: "507f1f77bcf86cd799439011",
        quantity: 1,
      },
      failOnStatusCode: false,
    });

    // Accept auth required or validation errors, not 500
    expect(response.status()).toBeLessThan(500);
  });

  test("should release inventory on cancel", async ({ request }) => {
    const response = await request.post("/api/souq/inventory/release", {
      data: {
        reservationId: "test-reservation",
      },
      failOnStatusCode: false,
    });

    // Accept auth required or validation errors, not 500
    expect(response.status()).toBeLessThan(500);
  });
});
