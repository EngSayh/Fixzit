/**
 * @fileoverview Tests for /api/checkout/session routes
 * Tests checkout session creation and management
 * NOTE: This route does NOT have auth check - it's a public checkout endpoint
 * 
 * Uses mutable module-scope variables for Vitest forks isolation compatibility.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============= MUTABLE TEST CONTEXT =============
let mockSmartRateLimitAllowed = true;
let mockCheckoutResult: unknown = { sessionId: "session_123" };

// ============= MOCK DEFINITIONS =============
// Mock factories read from mutable variables via closures.

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(async () => ({ allowed: mockSmartRateLimitAllowed })),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() => new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/db/mongoose", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((data, status) => new Response(JSON.stringify(data), { status })),
  getClientIP: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/finance/checkout", () => ({
  createSubscriptionCheckout: vi.fn(async () => mockCheckoutResult),
}));

// Static import AFTER vi.mock() declarations
import { POST } from "@/app/api/checkout/session/route";

describe("API /api/checkout/session", () => {
  beforeEach(() => {
    mockSmartRateLimitAllowed = true;
    mockCheckoutResult = { sessionId: "session_123" };
    vi.clearAllMocks();
  });

  describe("POST - Create Checkout Session", () => {
    it("returns 429 when rate limit is exceeded", async () => {
      mockSmartRateLimitAllowed = false;

      const req = new NextRequest("http://localhost:3000/api/checkout/session", {
        method: "POST",
        body: JSON.stringify({
          subscriberType: "CORPORATE",
          modules: ["FM"],
          customer: { email: "test@example.com" },
          seats: 5,
        }),
      });
      const response = await POST(req);

      expect(response.status).toBe(429);
    });

    it("returns 400 for invalid subscriberType", async () => {
      const req = new NextRequest("http://localhost:3000/api/checkout/session", {
        method: "POST",
        body: JSON.stringify({
          subscriberType: "INVALID",
          modules: ["FM"],
          customer: { email: "test@example.com" },
          seats: 5,
        }),
      });
      const response = await POST(req);

      expect(response.status).toBe(400);
    });

    it("returns 400 for missing modules", async () => {
      const req = new NextRequest("http://localhost:3000/api/checkout/session", {
        method: "POST",
        body: JSON.stringify({
          subscriberType: "CORPORATE",
          modules: [],
          customer: { email: "test@example.com" },
          seats: 5,
        }),
      });
      const response = await POST(req);

      expect(response.status).toBe(400);
    });
  });
});
