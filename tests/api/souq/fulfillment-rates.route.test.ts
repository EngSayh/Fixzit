/**
 * @fileoverview Tests for /api/souq/fulfillment/rates routes
 * Tests shipping rate comparison functionality
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

let sessionUser: SessionUser | null = null;

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock authentication
vi.mock("@/lib/auth/getServerSession", () => ({
  getServerSession: vi.fn(async () => {
    if (!sessionUser) return null;
    return { user: sessionUser };
  }),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fulfillment service
vi.mock("@/services/souq/fulfillment-service", () => ({
  fulfillmentService: {
    getRates: vi.fn(),
    generateLabel: vi.fn(),
  },
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { fulfillmentService } from "@/services/souq/fulfillment-service";
import { POST } from "@/app/api/souq/fulfillment/rates/route";
import type { SessionUser } from "@/types/auth";

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
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    sessionUser = mockUser;
    // Mock must match IRate interface: { carrier, serviceType, cost, estimatedDays }
    vi.mocked(fulfillmentService.getRates).mockResolvedValue([
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
    ]);
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
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
        }) as unknown as null
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
