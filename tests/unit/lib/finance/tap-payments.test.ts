/**
 * TAP Payments API Client Unit Tests
 * 
 * Comprehensive tests for the TAP Payments integration covering:
 * - Client initialization and configuration
 * - Charge creation and retrieval
 * - Refund processing
 * - Webhook signature verification
 * - Helper functions
 * 
 * @module tests/unit/lib/finance/tap-payments.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

// Mock the logger before imports
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock tapConfig
vi.mock("@/lib/tapConfig", () => ({
  getTapConfig: vi.fn(() => ({
    secretKey: "sk_test_123",
    publicKey: "pk_test_123",
    webhookSecret: "whsec_test_123",
    environment: "test",
    isConfigured: true,
    isProd: false,
  })),
  assertTapConfig: vi.fn(),
}));

import { resetTestMocks } from "@/tests/helpers/mockDefaults";

import {
  buildTapCustomer,
  buildRedirectUrls,
  buildWebhookConfig,
  isChargeSuccessful,
  isChargePending,
  isChargeFailed,
  getChargeStatusMessage,
  type TapChargeResponse,
} from "@/lib/finance/tap-payments";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});

describe("TAP Payments", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.TAP_TEST_SECRET_KEY = "sk_test_123";
    process.env.NEXT_PUBLIC_TAP_TEST_PUBLIC_KEY = "pk_test_123";
    process.env.TAP_WEBHOOK_SECRET = "whsec_test_123";
    process.env.TAP_ENVIRONMENT = "test";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("buildTapCustomer", () => {
    it("should build customer object with basic info", () => {
      const customer = buildTapCustomer({
        firstName: "Ahmed",
        lastName: "Al-Rashid",
        email: "ahmed@example.com",
      });

      expect(customer).toEqual({
        first_name: "Ahmed",
        last_name: "Al-Rashid",
        email: "ahmed@example.com",
      });
    });

    it("should include phone when provided in correct format", () => {
      const customer = buildTapCustomer({
        firstName: "Ahmed",
        lastName: "Al-Rashid",
        email: "ahmed@example.com",
        phone: "+966501234567",
      });

      expect(customer.phone).toEqual({
        country_code: "+966",
        number: "501234567",
      });
    });

    it("should not include phone when format is invalid", () => {
      const customer = buildTapCustomer({
        firstName: "Ahmed",
        lastName: "Al-Rashid",
        email: "ahmed@example.com",
        phone: "invalid-phone",
      });

      expect(customer.phone).toBeUndefined();
    });

    it("should handle phone without plus sign", () => {
      const customer = buildTapCustomer({
        firstName: "Ahmed",
        lastName: "Al-Rashid",
        email: "ahmed@example.com",
        phone: "966501234567",
      });

      // Without + prefix, the regex won't match
      expect(customer.phone).toBeUndefined();
    });
  });

  describe("buildRedirectUrls", () => {
    it("should build redirect URL with default paths", () => {
      const redirect = buildRedirectUrls("https://fixzit.app");

      expect(redirect.url).toBe("https://fixzit.app/payments/success");
    });

    it("should build redirect URL with custom success path", () => {
      const redirect = buildRedirectUrls("https://fixzit.app", "/checkout/complete");

      expect(redirect.url).toBe("https://fixzit.app/checkout/complete");
    });
  });

  describe("buildWebhookConfig", () => {
    it("should build webhook URL", () => {
      const config = buildWebhookConfig("https://fixzit.app");

      expect(config.url).toBe("https://fixzit.app/api/payments/tap/webhook");
    });
  });

  describe("Charge Status Helpers", () => {
    const createMockCharge = (status: TapChargeResponse["status"]): TapChargeResponse => ({
      id: "chg_test_123",
      object: "charge",
      live_mode: false,
      api_version: "v2",
      amount: 10000,
      currency: "SAR",
      customer: {
        id: "cus_test_123",
        first_name: "Test",
        last_name: "User",
        email: "test@example.com",
        phone: { country_code: "+966", number: "501234567" },
      },
      source: {
        id: "src_test_123",
        object: "token",
        type: "CARD",
        payment_method: "VISA",
        payment_type: "CREDIT",
      },
      redirect: {
        status: "COMPLETED",
        url: "https://example.com/callback",
      },
      response: {
        code: "000",
        message: "Success",
      },
      transaction: {
        timezone: "UTC+03:00",
        created: new Date().toISOString(),
        url: "https://checkout.tap.company/test",
        expiry: { period: 30, type: "MINUTE" },
        asynchronous: false,
      },
      status,
    });

    describe("isChargeSuccessful", () => {
      it("should return true for CAPTURED status", () => {
        expect(isChargeSuccessful(createMockCharge("CAPTURED"))).toBe(true);
      });

      it("should return true for AUTHORIZED status", () => {
        expect(isChargeSuccessful(createMockCharge("AUTHORIZED"))).toBe(true);
      });

      it("should return false for INITIATED status", () => {
        expect(isChargeSuccessful(createMockCharge("INITIATED"))).toBe(false);
      });

      it("should return false for DECLINED status", () => {
        expect(isChargeSuccessful(createMockCharge("DECLINED"))).toBe(false);
      });

      it("should return false for FAILED status", () => {
        expect(isChargeSuccessful(createMockCharge("FAILED"))).toBe(false);
      });
    });

    describe("isChargePending", () => {
      it("should return true for INITIATED status", () => {
        expect(isChargePending(createMockCharge("INITIATED"))).toBe(true);
      });

      it("should return false for CAPTURED status", () => {
        expect(isChargePending(createMockCharge("CAPTURED"))).toBe(false);
      });
    });

    describe("isChargeFailed", () => {
      it("should return true for DECLINED status", () => {
        expect(isChargeFailed(createMockCharge("DECLINED"))).toBe(true);
      });

      it("should return true for CANCELLED status", () => {
        expect(isChargeFailed(createMockCharge("CANCELLED"))).toBe(true);
      });

      it("should return true for FAILED status", () => {
        expect(isChargeFailed(createMockCharge("FAILED"))).toBe(true);
      });

      it("should return false for CAPTURED status", () => {
        expect(isChargeFailed(createMockCharge("CAPTURED"))).toBe(false);
      });

      it("should return false for INITIATED status", () => {
        expect(isChargeFailed(createMockCharge("INITIATED"))).toBe(false);
      });
    });

    describe("getChargeStatusMessage", () => {
      it("should return Arabic message for CAPTURED", () => {
        const message = getChargeStatusMessage(createMockCharge("CAPTURED"), "ar");
        expect(message).toBe("تمت العملية بنجاح");
      });

      it("should return English message for CAPTURED", () => {
        const message = getChargeStatusMessage(createMockCharge("CAPTURED"), "en");
        expect(message).toBe("Payment successful");
      });

      it("should return Arabic message for DECLINED", () => {
        const message = getChargeStatusMessage(createMockCharge("DECLINED"), "ar");
        expect(message).toBe("تم الرفض");
      });

      it("should return English message for DECLINED", () => {
        const message = getChargeStatusMessage(createMockCharge("DECLINED"), "en");
        expect(message).toBe("Payment declined");
      });

      it("should return Arabic message for INITIATED (pending)", () => {
        const message = getChargeStatusMessage(createMockCharge("INITIATED"), "ar");
        expect(message).toBe("قيد المعالجة");
      });

      it("should default to Arabic if no locale specified", () => {
        const message = getChargeStatusMessage(createMockCharge("CAPTURED"));
        expect(message).toBe("تمت العملية بنجاح");
      });
    });
  });

  describe("TapPaymentsClient", () => {
    describe("createCharge", () => {
      it("should create charge with mocked fetch", async () => {
        const mockResponse = {
          id: "chg_test_123",
          object: "charge",
          live_mode: false,
          api_version: "v2",
          amount: 10000,
          currency: "SAR",
          status: "INITIATED",
          transaction: {
            url: "https://checkout.tap.company/test",
            created: new Date().toISOString(),
            timezone: "UTC+03:00",
            expiry: { period: 30, type: "MINUTE" },
            asynchronous: false,
          },
        };

        const mockFetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });
        global.fetch = mockFetch;

        // Import fresh to get mocked dependencies
        const { tapPayments } = await import("@/lib/finance/tap-payments");

        const result = await tapPayments.createCharge({
          amount: 10000,
          currency: "SAR",
          customer: {
            first_name: "Test",
            last_name: "User",
            email: "test@example.com",
          },
          redirect: { url: "https://example.com/callback" },
        });

        expect(result.id).toBe("chg_test_123");
        expect(result.status).toBe("INITIATED");
        expect(mockFetch).toHaveBeenCalledWith(
          "https://api.tap.company/v2/charges",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
          })
        );
      });

      it("should throw error on API failure", async () => {
        const mockFetch = vi.fn().mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            errors: [{ code: "401", description: "Unauthorized" }],
          }),
        });
        global.fetch = mockFetch;

        const { tapPayments } = await import("@/lib/finance/tap-payments");

        await expect(
          tapPayments.createCharge({
            amount: 10000,
            currency: "SAR",
            customer: {
              first_name: "Test",
              last_name: "User",
              email: "test@example.com",
            },
            redirect: { url: "https://example.com/callback" },
          })
        ).rejects.toThrow("Unauthorized");
      });
    });

    describe("getCharge", () => {
      it("should retrieve charge by ID", async () => {
        const mockResponse = {
          id: "chg_test_123",
          status: "CAPTURED",
        };

        const mockFetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });
        global.fetch = mockFetch;

        const { tapPayments } = await import("@/lib/finance/tap-payments");

        const result = await tapPayments.getCharge("chg_test_123");

        expect(result.id).toBe("chg_test_123");
        expect(result.status).toBe("CAPTURED");
        expect(mockFetch).toHaveBeenCalledWith(
          "https://api.tap.company/v2/charges/chg_test_123",
          expect.objectContaining({
            method: "GET",
          })
        );
      });
    });

    describe("createRefund", () => {
      it("should create refund for charge", async () => {
        const mockResponse = {
          id: "ref_test_123",
          object: "refund",
          status: "PENDING",
          charge: "chg_test_123",
          amount: 5000,
        };

        const mockFetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });
        global.fetch = mockFetch;

        const { tapPayments } = await import("@/lib/finance/tap-payments");

        const result = await tapPayments.createRefund({
          charge_id: "chg_test_123",
          amount: 5000,
          currency: "SAR",
          reason: "Customer request",
        });

        expect(result.id).toBe("ref_test_123");
        expect(result.status).toBe("PENDING");
        expect(result.charge).toBe("chg_test_123");
      });
    });

    describe("verifyWebhookSignature", () => {
      it("should verify valid signature", async () => {
        const payload = JSON.stringify({ id: "evt_test_123", type: "charge.captured" });
        const secret = "whsec_test_123";
        const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

        const { tapPayments } = await import("@/lib/finance/tap-payments");

        const isValid = tapPayments.verifyWebhookSignature(payload, signature);
        expect(isValid).toBe(true);
      });

      it("should reject invalid signature", async () => {
        const payload = JSON.stringify({ id: "evt_test_123", type: "charge.captured" });

        const { tapPayments } = await import("@/lib/finance/tap-payments");

        const isValid = tapPayments.verifyWebhookSignature(payload, "invalid_signature");
        expect(isValid).toBe(false);
      });
    });

    describe("Currency helpers", () => {
      it("should convert SAR to halalas", async () => {
        const { tapPayments } = await import("@/lib/finance/tap-payments");

        expect(tapPayments.sarToHalalas(100)).toBe(10000);
        expect(tapPayments.sarToHalalas(12.50)).toBe(1250);
        expect(tapPayments.sarToHalalas(0.01)).toBe(1);
      });

      it("should convert halalas to SAR", async () => {
        const { tapPayments } = await import("@/lib/finance/tap-payments");

        expect(tapPayments.halalasToSAR(10000)).toBe(100);
        expect(tapPayments.halalasToSAR(1250)).toBe(12.50);
        expect(tapPayments.halalasToSAR(1)).toBe(0.01);
      });

      it("should format amount for display", async () => {
        const { tapPayments } = await import("@/lib/finance/tap-payments");

        // Test with English locale for predictable output
        const formatted = tapPayments.formatAmount(10000, "en-US");
        expect(formatted).toContain("100");
        expect(formatted).toContain("SAR");
      });
    });
  });
});
