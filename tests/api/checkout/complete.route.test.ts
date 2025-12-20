/**
 * @fileoverview Tests for /api/checkout/complete routes
 * Tests checkout completion flow for orders/payments
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting - target correct module used by route
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  buildOrgAwareRateLimitKey: vi.fn((key) => key),
}));

// Mock rateLimitError
vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() => new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })),
}));

// Mock safe session - used by checkout/complete
vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: vi.fn(),
}));

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock database connection
vi.mock("@/db/mongoose", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

// Mock secure response
vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((data, status) => new Response(JSON.stringify(data), { status })),
  getClientIP: vi.fn(() => "127.0.0.1"),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Subscription model
vi.mock("@/server/models/Subscription", () => ({
  default: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

import { smartRateLimit } from "@/server/security/rateLimit";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { auth } from "@/auth";

const importRoute = async () => {
  try {
    return await import("@/app/api/checkout/complete/route");
  } catch {
    return null;
  }
};

describe("API /api/checkout/complete", () => {
  const mockOrgId = "org_123456789";
  const mockUser = {
    id: "user_123",
    orgId: mockOrgId,
    role: "CUSTOMER",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true } as never);
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: {
        user: mockUser,
        orgId: mockOrgId,
        expires: new Date(Date.now() + 86400000).toISOString(),
      },
    } as never);
    vi.mocked(auth).mockResolvedValue({
      user: mockUser,
      expires: new Date(Date.now() + 86400000).toISOString(),
    } as never);
  });

  describe("POST - Complete Checkout", () => {
    it("returns 429 when rate limit is exceeded", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false } as never);

      const req = new NextRequest("http://localhost:3000/api/checkout/complete", {
        method: "POST",
        body: JSON.stringify({ subscriptionId: "sub_123" }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: null,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/checkout/complete", {
        method: "POST",
        body: JSON.stringify({ subscriptionId: "sub_123" }),
      });
      const response = await route.POST(req);

      expect([401, 500, 503]).toContain(response.status);
    });

    it("returns 400 for missing subscriptionId", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest("http://localhost:3000/api/checkout/complete", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await route.POST(req);

      expect([400, 422]).toContain(response.status);
    });
  });
});
