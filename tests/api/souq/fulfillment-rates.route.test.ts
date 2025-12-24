/**
 * @fileoverview Tests for /api/souq/fulfillment/rates routes
 * Tests shipping rate comparison functionality
 * 
 * Uses mutable module-scope variables for Vitest forks isolation compatibility.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { SessionUser } from "@/types/auth";

// ============= MUTABLE TEST CONTEXT =============
// These module-scope variables are read by mock factories at call time.
// Tests set these values BEFORE calling route handlers.

let sessionUser: SessionUser | null = null;
let mockRateLimitResponse: Response | null = null;
let mockRatesResult: Array<{
  carrier: string;
  serviceType: string;
  cost: number;
  estimatedDays: number;
}> = [];

// ============= MOCK DEFINITIONS =============
// Mock factories read from mutable variables via closures.

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

vi.mock("@/lib/auth/getServerSession", () => ({
  getServerSession: vi.fn(async () => {
    if (!sessionUser) return null;
    return { user: sessionUser };
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/services/souq/fulfillment-service", () => ({
  fulfillmentService: {
    getRates: vi.fn(async () => mockRatesResult),
    generateLabel: vi.fn(),
  },
}));

// Static imports AFTER vi.mock() declarations
import { POST } from "@/app/api/souq/fulfillment/rates/route";

describe("API /api/souq/fulfillment/rates", () => {
  const mockOrgId = "org_123456789";
  const mockUser: SessionUser = {
    id: "user_123",
    orgId: mockOrgId,
    role: "TEAM_MEMBER",
    subRole: "SELLER",
    email: "seller@test.com",
    isSuperAdmin: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mutable context to defaults
    mockRateLimitResponse = null; // null = rate limit passes
    sessionUser = mockUser;
    mockRatesResult = [
      {
        carrier: "SMSA",
        serviceType: "standard",
        cost: 25.0,
        estimatedDays: 3,
      },
      {
        carrier: "Aramex",
        serviceType: "express",
        cost: 45.0,
        estimatedDays: 1,
      },
    ];
  });

  describe("POST /api/souq/fulfillment/rates", () => {
    it("should return 401 when not authenticated", async () => {
      sessionUser = null;

      const request = new NextRequest(
        "http://localhost/api/souq/fulfillment/rates",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should return 400 for missing required fields", async () => {

      const request = new NextRequest(
        "http://localhost/api/souq/fulfillment/rates",
        {
          method: "POST",
          body: JSON.stringify({ origin: "Riyadh" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should return shipping rates with valid data", async () => {
      const validData = {
        origin: "Riyadh",
        destination: "Jeddah",
        weight: 2.5,
        serviceType: "standard",
      };

      const request = new NextRequest(
        "http://localhost/api/souq/fulfillment/rates",
        {
          method: "POST",
          body: JSON.stringify(validData),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await POST(request);
      expect(response.status).toBe(200);
      if (response.status === 200) {
        const data = await response.json();
        expect(data.rates).toBeDefined();
      }
    });

    it("should support dimensions parameter", async () => {
      const validData = {
        origin: "Riyadh",
        destination: "Dammam",
        weight: 1.0,
        dimensions: { length: 30, width: 20, height: 10, unit: "cm" },
        serviceType: "express",
      };

      const request = new NextRequest(
        "http://localhost/api/souq/fulfillment/rates",
        {
          method: "POST",
          body: JSON.stringify(validData),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it("should enforce rate limiting", async () => {
      // Set mutable context to return rate limit response
      mockRateLimitResponse = new Response(
        JSON.stringify({ error: "Too many requests" }),
        { status: 429 }
      );

      const request = new NextRequest(
        "http://localhost/api/souq/fulfillment/rates",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await POST(request);
      expect(response.status).toBe(429);
    });
  });
});
