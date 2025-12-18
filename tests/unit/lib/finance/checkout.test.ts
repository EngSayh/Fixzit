import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock setup - use vi.hoisted to ensure mocks are available at module load time
const { mockPriceBookModel, mockSubscriptionModel, mockQuotePrice, mockTapPayments } = vi.hoisted(() => ({
  mockPriceBookModel: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
  mockSubscriptionModel: {
    create: vi.fn(),
  },
  mockQuotePrice: vi.fn(),
  mockTapPayments: {
    createCharge: vi.fn(),
  },
}));

vi.mock("@/server/models/PriceBook", () => ({
  __esModule: true,
  default: mockPriceBookModel,
}));

vi.mock("@/server/models/Subscription", () => ({
  __esModule: true,
  default: mockSubscriptionModel,
}));

vi.mock("@/lib/finance/pricing", () => ({
  quotePrice: mockQuotePrice,
  BillingCycle: {
    ANNUAL: "ANNUAL",
    MONTHLY: "MONTHLY",
  },
}));

vi.mock("@/lib/finance/tap-payments", () => ({
  tapPayments: mockTapPayments,
  buildTapCustomer: ({
    firstName,
    lastName,
    email,
    phone,
  }: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  }) => ({
    first_name: firstName,
    last_name: lastName,
    email,
    ...(phone
      ? {
          phone: {
            country_code: "+966",
            number: phone,
          },
        }
      : {}),
  }),
}));

import { createSubscriptionCheckout } from "@/lib/finance/checkout";

const originalEnv = { ...process.env };

describe("createSubscriptionCheckout", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.APP_URL = "https://app.test";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("creates a TAP checkout session and returns redirect URL", async () => {
    const mockPriceBook = { _id: "pb1", currency: "SAR", active: true };
    mockPriceBookModel.findById.mockResolvedValue(null);
    mockPriceBookModel.findOne.mockResolvedValue(mockPriceBook);

    mockQuotePrice.mockResolvedValue({
      requiresQuote: false,
      total: 250,
      modules: ["core"],
      seats: 5,
      billingCycle: "ANNUAL",
    });

    const save = vi.fn();
    const deleteOne = vi.fn();
    mockSubscriptionModel.create.mockResolvedValue({
      _id: "sub1",
      tap: {},
      amount: 0,
      save,
      deleteOne,
    });

    mockTapPayments.createCharge.mockResolvedValue({
      id: "chg1",
      transaction: { url: "https://pay.test/checkout/sub1" },
    });

    const result = await createSubscriptionCheckout({
      subscriberType: "CORPORATE",
      tenantId: "tenant-123",
      modules: ["core"],
      seats: 5,
      billingCycle: "ANNUAL",
      currency: "SAR",
      customer: { name: "Test User", email: "test@example.com" },
    });

    expect(result.requiresQuote).toBe(false);
    if (result.requiresQuote === false) {
      expect(result.redirectUrl).toBe("https://pay.test/checkout/sub1");
      expect(result.subscriptionId).toBe("sub1");
      expect(save).toHaveBeenCalledTimes(1);
    }
    expect(mockTapPayments.createCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 250,
        currency: "SAR",
        metadata: expect.objectContaining({ subscriptionId: "sub1" }),
      }),
    );
  });

  it("returns quote-required response when pricing requires manual quote", async () => {
    const mockPriceBook = { _id: "pb1", currency: "SAR", active: true };
    mockPriceBookModel.findById.mockResolvedValue(null);
    mockPriceBookModel.findOne.mockResolvedValue(mockPriceBook);

    mockQuotePrice.mockResolvedValue({
      requiresQuote: true,
      reason: "NEEDS_APPROVAL",
    });

    const result = await createSubscriptionCheckout({
      subscriberType: "OWNER",
      ownerUserId: "owner-1",
      modules: ["core"],
      seats: 10,
      billingCycle: "MONTHLY",
      currency: "SAR",
      customer: { name: "Owner User", email: "owner@example.com" },
    });

    expect(result.requiresQuote).toBe(true);
    if (result.requiresQuote) {
      expect(result.quote.reason).toBe("NEEDS_APPROVAL");
    }
    expect(mockTapPayments.createCharge).not.toHaveBeenCalled();
  });

  it("throws when APP_URL is missing", async () => {
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    mockPriceBookModel.findOne.mockResolvedValue({ _id: "pb1", currency: "SAR" });
    mockQuotePrice.mockResolvedValue({
      requiresQuote: false,
      total: 100,
      modules: ["core"],
      seats: 1,
      billingCycle: "MONTHLY",
    });

    await expect(
      createSubscriptionCheckout({
        subscriberType: "CORPORATE",
        tenantId: "tenant-123",
        modules: ["core"],
        seats: 1,
        billingCycle: "MONTHLY",
        currency: "SAR",
        customer: { name: "Test User", email: "test@example.com" },
      }),
    ).rejects.toThrow("APP_URL environment variable is not configured");
  });
});
