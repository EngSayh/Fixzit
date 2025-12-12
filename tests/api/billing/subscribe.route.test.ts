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

// Mock canManageSubscriptions - sync function
vi.mock("@/lib/auth/role-guards", () => ({
  canManageSubscriptions: vi.fn().mockReturnValue(true),
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
import { POST } from "@/app/api/billing/subscribe/route";
import { NextRequest } from "next/server";

function createRequest(body: Record<string, unknown>, hasAuth = true): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (hasAuth) {
    headers["Authorization"] = "Bearer test-token";
  }
  
  return new NextRequest(new URL("/api/billing/subscribe", "http://localhost:3000"), {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
}

describe("API /api/billing/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 when authorization header is missing", async () => {
      const req = createRequest({}, false);
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
});
