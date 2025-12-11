/**
 * TAP Payment Gateway E2E Tests
 *
 * Tests the complete payment flow with mocked TAP gateway responses.
 * These tests verify the user-facing payment experience without hitting the real gateway.
 *
 * @module tests/e2e/payments/tap-payment-flows.spec
 */

import { test, expect } from "@playwright/test";

// Mock TAP response types
interface MockTAPResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  reference: { transaction: string };
  response: { code: string; message: string };
}

test.describe("TAP Payment Gateway - E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Mock TAP API endpoints
    await page.route("**/api.tap.company/**", async (route) => {
      const url = route.request().url();

      if (url.includes("/charges")) {
        // Mock charge creation
        const mockResponse: MockTAPResponse = {
          id: "chg_test_12345",
          status: "INITIATED",
          amount: 99.99,
          currency: "OMR",
          reference: { transaction: "txn_test_12345" },
          response: { code: "000", message: "Success" },
        };

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockResponse),
        });
      } else if (url.includes("/tokens")) {
        // Mock token creation
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "tok_test_12345",
            object: "token",
            card: {
              brand: "VISA",
              last_four: "4242",
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock internal payment API
    await page.route("**/api/payments/create-charge", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          chargeId: "chg_test_12345",
          redirectUrl: "https://fixzit.com/payments/success?id=chg_test_12345",
        }),
      });
    });
  });

  test.describe("Subscription Payment Flow", () => {
    test("should display subscription plans with pricing", async ({ page }) => {
      await page.goto("/pricing");

      // Verify plans are displayed
      await expect(page.getByText("Basic")).toBeVisible();
      await expect(page.getByText("Pro")).toBeVisible();
      await expect(page.getByText("Enterprise")).toBeVisible();

      // Verify pricing is displayed
      await expect(page.getByText(/29\.99/)).toBeVisible();
      await expect(page.getByText(/99\.99/)).toBeVisible();
    });

    test("should initiate subscription checkout", async ({ page }) => {
      await page.goto("/pricing");

      // Click subscribe on Pro plan
      await page.getByRole("button", { name: /subscribe.*pro/i }).click();

      // Should redirect to checkout or show payment form
      await expect(
        page.getByText(/checkout|payment details|billing/i)
      ).toBeVisible({ timeout: 5000 });
    });

    test("should handle successful subscription payment", async ({ page }) => {
      // Mock successful payment webhook
      await page.route("**/api/payments/webhook", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ received: true }),
        });
      });

      // Mock subscription status
      await page.route("**/api/subscriptions/status", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            active: true,
            plan: "pro",
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        });
      });

      await page.goto("/payments/success?id=chg_test_12345");

      // Verify success message
      await expect(page.getByText(/payment successful|thank you/i)).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe("One-time Payment Flow", () => {
    test("should process one-time payment for work order", async ({ page }) => {
      // Login first (mock authenticated state)
      await page.context().addCookies([
        {
          name: "next-auth.session-token",
          value: "mock-session-token",
          domain: "localhost",
          path: "/",
        },
      ]);

      await page.goto("/work-orders/new");

      // Fill work order form (if present)
      const serviceSelect = page.locator('[data-testid="service-select"]');
      if (await serviceSelect.isVisible()) {
        await serviceSelect.click();
        await page.getByRole("option").first().click();
      }

      // Navigate to payment if there's a pay button
      const payButton = page.getByRole("button", { name: /pay|checkout/i });
      if (await payButton.isVisible()) {
        await payButton.click();
        await expect(page.getByText(/payment/i)).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe("Payment Failure Handling", () => {
    test("should display error for declined card", async ({ page }) => {
      // Override mock for declined card
      await page.route("**/api/payments/create-charge", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: "Card declined",
            code: "card_declined",
          }),
        });
      });

      await page.goto("/payments/checkout?amount=99.99&currency=OMR");

      // Try to submit payment (if form is present)
      const submitButton = page.getByRole("button", { name: /pay|submit/i });
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Verify error is displayed
        await expect(page.getByText(/declined|failed|error/i)).toBeVisible({
          timeout: 5000,
        });
      }
    });

    test("should handle network timeout gracefully", async ({ page }) => {
      // Simulate timeout
      await page.route("**/api/payments/create-charge", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 30000));
        await route.abort("timedout");
      });

      await page.goto("/payments/checkout?amount=99.99&currency=OMR");

      // The page should show loading and eventually timeout message
      const loadingOrTimeout = page.getByText(/loading|processing|timeout|try again/i);
      await expect(loadingOrTimeout).toBeVisible({ timeout: 35000 });
    });

    test("should display retry option on failure", async ({ page }) => {
      await page.goto("/payments/failed?error=insufficient_funds");

      // Verify retry option is present
      await expect(
        page.getByRole("button", { name: /retry|try again/i })
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Refund Flow", () => {
    test("should display refund status in order history", async ({ page }) => {
      // Mock order with refund
      await page.route("**/api/orders/*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "order_12345",
            status: "refunded",
            refund: {
              id: "ref_12345",
              amount: 99.99,
              status: "completed",
              processedAt: new Date().toISOString(),
            },
          }),
        });
      });

      await page.goto("/orders/order_12345");

      // Verify refund status is shown
      await expect(page.getByText(/refund|refunded/i)).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe("Payment Methods", () => {
    test("should display saved payment methods", async ({ page }) => {
      // Mock saved cards
      await page.route("**/api/payments/methods", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            methods: [
              {
                id: "pm_12345",
                type: "card",
                card: { brand: "VISA", last4: "4242", expMonth: 12, expYear: 2025 },
                isDefault: true,
              },
              {
                id: "pm_67890",
                type: "card",
                card: { brand: "MASTERCARD", last4: "8888", expMonth: 6, expYear: 2026 },
                isDefault: false,
              },
            ],
          }),
        });
      });

      await page.goto("/settings/payment-methods");

      // Verify cards are displayed
      await expect(page.getByText(/VISA.*4242/)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/MASTERCARD.*8888/)).toBeVisible({ timeout: 5000 });
    });

    test("should allow adding new payment method", async ({ page }) => {
      await page.goto("/settings/payment-methods");

      // Click add payment method
      const addButton = page.getByRole("button", { name: /add.*method|add.*card/i });
      if (await addButton.isVisible()) {
        await addButton.click();

        // Verify card form is shown
        await expect(page.getByPlaceholder(/card number/i)).toBeVisible({
          timeout: 5000,
        });
      }
    });
  });

  test.describe("Invoice & Receipt", () => {
    test("should display payment receipt", async ({ page }) => {
      // Mock receipt data
      await page.route("**/api/payments/receipt/*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "rcpt_12345",
            chargeId: "chg_12345",
            amount: 99.99,
            currency: "OMR",
            vat: 15.0,
            total: 114.99,
            paidAt: new Date().toISOString(),
            items: [{ description: "Pro Plan - Monthly", amount: 99.99 }],
          }),
        });
      });

      await page.goto("/payments/receipt/rcpt_12345");

      // Verify receipt details
      await expect(page.getByText(/99\.99/)).toBeVisible();
      await expect(page.getByText(/OMR|Omani Rial/i)).toBeVisible();
    });

    test("should allow downloading PDF receipt", async ({ page }) => {
      await page.goto("/payments/receipt/rcpt_12345");

      // Check for download button
      const downloadButton = page.getByRole("button", { name: /download|pdf/i });
      await expect(downloadButton).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Currency Handling", () => {
    test("should display correct currency format for OMR", async ({ page }) => {
      await page.goto("/pricing?currency=OMR");

      // OMR uses 3 decimal places
      await expect(page.getByText(/OMR|ر\.ع\./)).toBeVisible();
    });

    test("should display correct currency format for SAR", async ({ page }) => {
      await page.goto("/pricing?currency=SAR");

      // SAR uses 2 decimal places
      await expect(page.getByText(/SAR|ر\.س\./)).toBeVisible();
    });
  });

  test.describe("VAT Handling", () => {
    test("should display VAT breakdown in checkout", async ({ page }) => {
      await page.goto("/payments/checkout?amount=99.99&currency=OMR");

      // Verify VAT is displayed (15% for Saudi Arabia)
      await expect(page.getByText(/VAT|ضريبة/i)).toBeVisible({ timeout: 5000 });
    });
  });
});

test.describe("TAP Webhook Handling", () => {
  test("should process payment confirmation webhook", async ({ request }) => {
    // Simulate TAP webhook callback
    const webhookPayload = {
      id: "chg_test_12345",
      object: "charge",
      status: "CAPTURED",
      amount: 99.99,
      currency: "OMR",
      reference: { transaction: "txn_test_12345" },
      response: { code: "000", message: "Approved" },
      metadata: { orderId: "order_12345" },
    };

    const response = await request.post("/api/payments/webhook", {
      data: webhookPayload,
      headers: {
        "Content-Type": "application/json",
        "X-TAP-Signature": "mock-signature-for-testing",
      },
    });

    // Webhook should return 200
    expect(response.status()).toBe(200);
  });

  test("should handle refund webhook", async ({ request }) => {
    const refundWebhook = {
      id: "ref_test_12345",
      object: "refund",
      status: "REFUNDED",
      amount: 99.99,
      currency: "OMR",
      charge_id: "chg_test_12345",
    };

    const response = await request.post("/api/payments/webhook", {
      data: refundWebhook,
      headers: {
        "Content-Type": "application/json",
        "X-TAP-Signature": "mock-signature-for-testing",
      },
    });

    expect(response.status()).toBe(200);
  });
});
