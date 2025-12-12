/**
 * @vitest-environment node
 * Tests for POST /api/billing/subscribe
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getUserFromToken
vi.mock("@/lib/auth", () => ({
  getUserFromToken: vi.fn(),
}));

// Mock rate limiter
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9 }),
}));

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue({}),
}));

// Mock canManageSubscriptions
vi.mock("@/lib/auth/role-guards", () => ({
  canManageSubscriptions: vi.fn().mockResolvedValue(true),
}));

// Mock Customer model
vi.mock("@/server/models/Customer", () => ({
  default: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
    create: vi.fn().mockResolvedValue({ _id: "cust123" }),
  },
}));

// Mock pricing
vi.mock("@/lib/pricing", () => ({
  computeQuote: vi.fn().mockReturnValue({
    monthlyTotal: 100,
    annualTotal: 1000,
    requiresQuote: false,
  }),
}));

// Mock checkout
vi.mock("@/lib/finance/checkout", () => ({
  createSubscriptionCheckout: vi.fn().mockResolvedValue({
    checkoutUrl: "https://paytabs.com/checkout/123",
    subscriptionId: "sub123",
  }),
}));

import { getUserFromToken } from "@/lib/auth";
import { smartRateLimit } from "@/server/security/rateLimit";
import { canManageSubscriptions } from "@/lib/auth/role-guards";
import { POST } from "@/app/api/billing/subscribe/route";
import { NextRequest } from "next/server";

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL("/api/billing/subscribe", "http://localhost:3000"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test-token",
    },
  });
}

describe("API /api/billing/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 when authorization header is missing", async () => {
      const req = new NextRequest(new URL("/api/billing/subscribe", "http://localhost:3000"), {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("returns 401 when token is invalid", async () => {
      vi.mocked(getUserFromToken).mockResolvedValueOnce(null);

      const req = createRequest({});
      const res = await POST(req);

      expect(res.status).toBe(401);
    });
  });

  describe("Authorization", () => {
    it("returns 403 when user lacks subscription management permissions", async () => {
      vi.mocked(getUserFromToken).mockResolvedValueOnce({
        id: "user123",
        email: "test@example.com",
        role: "USER",
        orgId: "org123",
      } as never);
      vi.mocked(canManageSubscriptions).mockResolvedValueOnce(false);

      const req = createRequest({
        customer: {
          type: "ORG",
          name: "Test Org",
          billingEmail: "billing@test.com",
        },
        planType: "CORPORATE_FM",
        items: [],
        seatTotal: 10,
        billingCycle: "monthly",
        returnUrl: "https://example.com/return",
        callbackUrl: "https://example.com/callback",
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
    });
  });

  describe("Rate Limiting", () => {
    it("returns 429 when rate limit exceeded", async () => {
      vi.mocked(smartRateLimit).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 60000,
      } as never);

      const req = createRequest({});
      const res = await POST(req);

      expect(res.status).toBe(429);
    });
  });

  describe("Validation", () => {
    it("validates required fields in request body", async () => {
      vi.mocked(getUserFromToken).mockResolvedValueOnce({
        id: "user123",
        email: "test@example.com",
        role: "ADMIN",
        orgId: "org123",
      } as never);
      vi.mocked(canManageSubscriptions).mockResolvedValueOnce(true);

      const req = createRequest({}); // Empty body
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("validates plan type enum values", async () => {
      vi.mocked(getUserFromToken).mockResolvedValueOnce({
        id: "user123",
        email: "test@example.com",
        role: "ADMIN",
        orgId: "org123",
      } as never);
      vi.mocked(canManageSubscriptions).mockResolvedValueOnce(true);

      const req = createRequest({
        customer: {
          type: "ORG",
          name: "Test Org",
          billingEmail: "billing@test.com",
        },
        planType: "INVALID_PLAN", // Invalid
        items: [],
        seatTotal: 10,
        billingCycle: "monthly",
        returnUrl: "https://example.com/return",
        callbackUrl: "https://example.com/callback",
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("Successful Subscription", () => {
    it("creates subscription and returns checkout URL", async () => {
      vi.mocked(getUserFromToken).mockResolvedValueOnce({
        id: "user123",
        email: "test@example.com",
        role: "ADMIN",
        orgId: "org123",
      } as never);
      vi.mocked(canManageSubscriptions).mockResolvedValueOnce(true);

      const req = createRequest({
        customer: {
          type: "ORG",
          name: "Test Org",
          billingEmail: "billing@test.com",
        },
        planType: "CORPORATE_FM",
        items: [{ moduleCode: "FM_CORE", seatCount: 5 }],
        seatTotal: 5,
        billingCycle: "monthly",
        returnUrl: "https://example.com/return",
        callbackUrl: "https://example.com/callback",
      });

      const res = await POST(req);
      // May return 200 or 201 depending on implementation
      expect([200, 201]).toContain(res.status);
    });
  });
});
