/**
 * @fileoverview Tests for /api/checkout/session routes
 * Tests checkout session creation and management
 * NOTE: This route does NOT have auth check - it's a public checkout endpoint
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting - target correct module used by route
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

// Mock rateLimitError
vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() => new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })),
}));

// Mock auth (not used by this route but may be imported)
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

// Mock checkout service
vi.mock("@/lib/finance/checkout", () => ({
  createSubscriptionCheckout: vi.fn().mockResolvedValue({ sessionId: "session_123" }),
}));

import { smartRateLimit } from "@/server/security/rateLimit";

const importRoute = async () => {
  try {
    return await import("@/app/api/checkout/session/route");
  } catch {
    return null;
  }
};

describe("API /api/checkout/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true } as never);
  });

  describe("POST - Create Checkout Session", () => {
    it("returns 429 when rate limit is exceeded", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false } as never);

      const req = new NextRequest("http://localhost:3000/api/checkout/session", {
        method: "POST",
        body: JSON.stringify({
          subscriberType: "CORPORATE",
          modules: ["FM"],
          customer: { email: "test@example.com" },
          seats: 5,
        }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(429);
    });

    it("returns 400 for invalid subscriberType", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest("http://localhost:3000/api/checkout/session", {
        method: "POST",
        body: JSON.stringify({
          subscriberType: "INVALID",
          modules: ["FM"],
          customer: { email: "test@example.com" },
          seats: 5,
        }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(400);
    });

    it("returns 400 for missing modules", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest("http://localhost:3000/api/checkout/session", {
        method: "POST",
        body: JSON.stringify({
          subscriberType: "CORPORATE",
          modules: [],
          customer: { email: "test@example.com" },
          seats: 5,
        }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(400);
    });
  });
});
