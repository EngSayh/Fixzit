/**
 * Checkout Flow Unit Tests
 * 
 * Tests for the subscription checkout flow using TAP Payments.
 * 
 * @module tests/unit/lib/finance/checkout.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the logger
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

// Mock TAP payments
const mockCreateCharge = vi.fn();
vi.mock("@/lib/finance/tap-payments", () => ({
  tapPayments: {
    createCharge: mockCreateCharge,
  },
  buildTapCustomer: vi.fn((user) => ({
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    ...(user.phone && {
      phone: {
        country_code: "+966",
        number: user.phone.replace(/^\+966/, ""),
      },
    }),
  })),
}));

// Mock MongoDB models
const mockSubscriptionCreate = vi.fn();
const mockSubscriptionSave = vi.fn();
const mockSubscriptionDeleteOne = vi.fn();
vi.mock("@/server/models/Subscription", () => ({
  default: {
    create: mockSubscriptionCreate,
  },
}));

const mockPriceBookFindById = vi.fn();
const mockPriceBookFindOne = vi.fn();
vi.mock("@/server/models/PriceBook", () => ({
  default: {
    findById: mockPriceBookFindById,
    findOne: mockPriceBookFindOne,
  },
}));

// Mock pricing
vi.mock("@/lib/finance/pricing", () => ({
  quotePrice: vi.fn(() => ({
    requiresQuote: false,
    total: 1000,
    subtotal: 1000,
    discount: 0,
    currency: "SAR",
    lineItems: [],
  })),
}));

describe("Checkout Flow", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://fixzit.app";
    process.env.APP_URL = "https://fixzit.app";

    // Reset mock implementations
    mockSubscriptionCreate.mockResolvedValue({
      _id: { toString: () => "sub_test_123" },
      tap: {},
      amount: 0,
      save: mockSubscriptionSave,
      deleteOne: mockSubscriptionDeleteOne,
    });

    mockSubscriptionSave.mockResolvedValue(undefined);
    mockSubscriptionDeleteOne.mockResolvedValue(undefined);

    mockPriceBookFindById.mockResolvedValue({
      _id: "pb_test_123",
      currency: "SAR",
      active: true,
    });

    mockPriceBookFindOne.mockResolvedValue({
      _id: "pb_test_123",
      currency: "SAR",
      active: true,
    });

    mockCreateCharge.mockResolvedValue({
      id: "chg_test_123",
      status: "INITIATED",
      transaction: {
        url: "https://checkout.tap.company/test",
      },
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("createSubscriptionCheckout", () => {
    it("should create checkout session successfully", async () => {
      const { createSubscriptionCheckout } = await import("@/lib/finance/checkout");

      const result = await createSubscriptionCheckout({
        subscriberType: "CORPORATE",
        tenantId: "tenant_123",
        modules: ["fm", "hr"],
        seats: 10,
        billingCycle: "MONTHLY",
        currency: "SAR",
        customer: {
          name: "Ahmed Al-Rashid",
          email: "ahmed@example.com",
          phone: "+966501234567",
        },
      });

      expect(result.requiresQuote).toBe(false);
      if (!result.requiresQuote) {
        expect(result.subscriptionId).toBe("sub_test_123");
        expect(result.redirectUrl).toBe("https://checkout.tap.company/test");
        expect(result.cartId).toContain("SUB-");
      }
    });

    it("should throw error when APP_URL is not configured", async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.APP_URL;

      // Re-import to get fresh module
      vi.resetModules();
      const { createSubscriptionCheckout } = await import("@/lib/finance/checkout");

      await expect(
        createSubscriptionCheckout({
          subscriberType: "OWNER",
          ownerUserId: "user_123",
          modules: ["fm"],
          seats: 1,
          billingCycle: "ANNUAL",
          currency: "SAR",
          customer: {
            name: "Test User",
            email: "test@example.com",
          },
        })
      ).rejects.toThrow("APP_URL environment variable is not configured");
    });

    it("should throw error when PriceBook not found", async () => {
      mockPriceBookFindOne.mockResolvedValue(null);
      mockPriceBookFindById.mockResolvedValue(null);

      vi.resetModules();
      const { createSubscriptionCheckout } = await import("@/lib/finance/checkout");

      await expect(
        createSubscriptionCheckout({
          subscriberType: "CORPORATE",
          tenantId: "tenant_123",
          modules: ["fm"],
          seats: 5,
          billingCycle: "MONTHLY",
          currency: "SAR",
          customer: {
            name: "Test User",
            email: "test@example.com",
          },
        })
      ).rejects.toThrow("PriceBook not found");
    });

    it("should use priceBookId when provided", async () => {
      const { createSubscriptionCheckout } = await import("@/lib/finance/checkout");

      await createSubscriptionCheckout({
        subscriberType: "CORPORATE",
        tenantId: "tenant_123",
        modules: ["fm"],
        seats: 5,
        billingCycle: "MONTHLY",
        currency: "SAR",
        customer: {
          name: "Test User",
          email: "test@example.com",
        },
        priceBookId: "custom_pb_123",
      });

      expect(mockPriceBookFindById).toHaveBeenCalledWith("custom_pb_123");
    });

    it("should clean up subscription on TAP charge failure", async () => {
      mockCreateCharge.mockRejectedValue(new Error("TAP API Error"));

      const { createSubscriptionCheckout } = await import("@/lib/finance/checkout");

      await expect(
        createSubscriptionCheckout({
          subscriberType: "CORPORATE",
          tenantId: "tenant_123",
          modules: ["fm"],
          seats: 5,
          billingCycle: "MONTHLY",
          currency: "SAR",
          customer: {
            name: "Test User",
            email: "test@example.com",
          },
        })
      ).rejects.toThrow("Failed to create payment session");

      expect(mockSubscriptionDeleteOne).toHaveBeenCalled();
    });

    it("should handle OWNER subscriber type correctly", async () => {
      const { createSubscriptionCheckout } = await import("@/lib/finance/checkout");

      await createSubscriptionCheckout({
        subscriberType: "OWNER",
        ownerUserId: "user_123",
        modules: ["aqar"],
        seats: 1,
        billingCycle: "ANNUAL",
        currency: "USD",
        customer: {
          name: "Property Owner",
          email: "owner@example.com",
        },
      });

      expect(mockSubscriptionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriber_type: "OWNER",
          owner_user_id: "user_123",
          tenant_id: undefined,
        })
      );
    });

    it("should parse customer name into first/last name", async () => {
      const { createSubscriptionCheckout } = await import("@/lib/finance/checkout");

      await createSubscriptionCheckout({
        subscriberType: "CORPORATE",
        tenantId: "tenant_123",
        modules: ["fm"],
        seats: 5,
        billingCycle: "MONTHLY",
        currency: "SAR",
        customer: {
          name: "Mohammed Abdullah Al-Rashid",
          email: "test@example.com",
        },
      });

      expect(mockCreateCharge).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: expect.objectContaining({
            first_name: "Mohammed",
            last_name: "Abdullah Al-Rashid",
          }),
        })
      );
    });

    it("should handle single name (no last name)", async () => {
      const { createSubscriptionCheckout } = await import("@/lib/finance/checkout");

      await createSubscriptionCheckout({
        subscriberType: "CORPORATE",
        tenantId: "tenant_123",
        modules: ["fm"],
        seats: 5,
        billingCycle: "MONTHLY",
        currency: "SAR",
        customer: {
          name: "Ahmed",
          email: "test@example.com",
        },
      });

      expect(mockCreateCharge).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: expect.objectContaining({
            first_name: "Ahmed",
            last_name: "",
          }),
        })
      );
    });

    it("should include metadata in TAP charge", async () => {
      const { createSubscriptionCheckout } = await import("@/lib/finance/checkout");

      await createSubscriptionCheckout({
        subscriberType: "CORPORATE",
        tenantId: "tenant_123",
        modules: ["fm", "hr"],
        seats: 10,
        billingCycle: "MONTHLY",
        currency: "SAR",
        customer: {
          name: "Test User",
          email: "test@example.com",
        },
        metadata: { campaignId: "promo_2024" },
      });

      expect(mockCreateCharge).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            subscriptionId: "sub_test_123",
            tenantId: "tenant_123",
            subscriberType: "CORPORATE",
          }),
        })
      );
    });

    it("should calculate correct period end for MONTHLY billing", async () => {
      const { createSubscriptionCheckout } = await import("@/lib/finance/checkout");

      await createSubscriptionCheckout({
        subscriberType: "CORPORATE",
        tenantId: "tenant_123",
        modules: ["fm"],
        seats: 5,
        billingCycle: "MONTHLY",
        currency: "SAR",
        customer: {
          name: "Test User",
          email: "test@example.com",
        },
      });

      const createCall = mockSubscriptionCreate.mock.calls[0][0];
      const periodStart = createCall.current_period_start;
      const periodEnd = createCall.current_period_end;

      const daysDiff = Math.round(
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(30);
    });

    it("should calculate correct period end for ANNUAL billing", async () => {
      const { createSubscriptionCheckout } = await import("@/lib/finance/checkout");

      await createSubscriptionCheckout({
        subscriberType: "CORPORATE",
        tenantId: "tenant_123",
        modules: ["fm"],
        seats: 5,
        billingCycle: "ANNUAL",
        currency: "SAR",
        customer: {
          name: "Test User",
          email: "test@example.com",
        },
      });

      const createCall = mockSubscriptionCreate.mock.calls[0][0];
      const periodStart = createCall.current_period_start;
      const periodEnd = createCall.current_period_end;

      const daysDiff = Math.round(
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(365);
    });
  });
});
