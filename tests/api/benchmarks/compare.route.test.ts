/**
 * @fileoverview Tests for /api/benchmarks/compare route
 * Tests authentication, validation, rate limiting, and benchmark comparison
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
let mockSession: { user?: { id: string; orgId?: string } } | null = null;
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

// Deterministic rate limit mock
let rateLimitAllowed = true;
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(async () => ({ allowed: rateLimitAllowed })),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(
    () =>
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
      })
  ),
  unauthorizedError: vi.fn(
    () =>
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  ),
  zodValidationError: vi.fn((errors) =>
    new Response(JSON.stringify({ error: "Validation failed", details: errors }), {
      status: 400,
    })
  ),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((body, status) => {
    return new Response(JSON.stringify(body), { status });
  }),
  getClientIP: vi.fn(() => "127.0.0.1"),
}));

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock Benchmark model
vi.mock("@/server/models/Benchmark", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
}));

// Mock pricing - return proper shape that matches route expectation
vi.mock("@/lib/pricing", () => ({
  computeQuote: vi.fn().mockReturnValue({
    monthly: 100,
    annualTotal: 1200,
    items: [{ moduleCode: "core", amount: 100 }],
    contactSales: false,
  }),
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

import { POST } from "@/app/api/benchmarks/compare/route";

describe("API /api/benchmarks/compare", () => {
  beforeEach(() => {
    mockSession = null;
    rateLimitAllowed = true;
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockSession = null;

      const req = new NextRequest(
        "http://localhost:3000/api/benchmarks/compare",
        {
          method: "POST",
          body: JSON.stringify({
            seatTotal: 10,
            billingCycle: "monthly",
            items: [{ moduleCode: "core" }],
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      expect(res.status).toBe(401);
    });
  });

  describe("Rate Limiting", () => {
    it("returns 429 when rate limited", async () => {
      rateLimitAllowed = false;
      mockSession = { user: { id: "user-123", orgId: "org-123" } };

      const req = new NextRequest(
        "http://localhost:3000/api/benchmarks/compare",
        {
          method: "POST",
          body: JSON.stringify({
            seatTotal: 10,
            billingCycle: "monthly",
            items: [{ moduleCode: "core" }],
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      expect(res.status).toBe(429);
    });
  });

  describe("Validation", () => {
    it("returns 400 for invalid seatTotal", async () => {
      mockSession = { user: { id: "user-123", orgId: "org-123" } };

      const req = new NextRequest(
        "http://localhost:3000/api/benchmarks/compare",
        {
          method: "POST",
          body: JSON.stringify({
            seatTotal: -5, // Invalid: must be positive
            billingCycle: "monthly",
            items: [{ moduleCode: "core" }],
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid billingCycle", async () => {
      mockSession = { user: { id: "user-123", orgId: "org-123" } };

      const req = new NextRequest(
        "http://localhost:3000/api/benchmarks/compare",
        {
          method: "POST",
          body: JSON.stringify({
            seatTotal: 10,
            billingCycle: "weekly", // Invalid: must be monthly or annual
            items: [{ moduleCode: "core" }],
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });

  describe("Success Cases", () => {
    it("returns benchmark comparison for valid request", async () => {
      mockSession = { user: { id: "user-123", orgId: "org-123" } };

      const req = new NextRequest(
        "http://localhost:3000/api/benchmarks/compare",
        {
          method: "POST",
          body: JSON.stringify({
            seatTotal: 10,
            billingCycle: "monthly",
            items: [{ moduleCode: "core" }],
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      // 200 for successful benchmark comparison
      expect(res.status).toBe(200);
      
      // Validate response structure - route returns {ours, market, position}
      const body = await res.json();
      expect(body).toHaveProperty("ours");
      expect(body.ours).toHaveProperty("monthly");
      expect(typeof body.ours.monthly).toBe("number");
      expect(body.ours).toHaveProperty("items");
      expect(Array.isArray(body.ours.items)).toBe(true);
      expect(body).toHaveProperty("market");
      expect(body).toHaveProperty("position");
    });
  });
});
