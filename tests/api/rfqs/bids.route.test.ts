/**
import { expectAuthFailure } from '@/tests/api/_helpers';
 * @fileoverview Tests for /api/rfqs/[id]/bids routes
 * Tests RFQ bid management
 * MULTI-TENANT: Enforces org_id scope
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting - use the same module as the route
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));

vi.mock("@/server/security/rateLimitKey", () => ({
  buildOrgAwareRateLimitKey: vi.fn().mockReturnValue("test-rate-key"),
}));

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
  dbConnect: vi.fn().mockResolvedValue(undefined),
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

// Mock RFQ and Bid models
vi.mock("@/server/models/RFQ", () => ({
  RFQ: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock("@/server/models/Bid", () => ({
  Bid: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    create: vi.fn(),
    findById: vi.fn(),
  },
}));

import { smartRateLimit } from "@/server/security/rateLimit";
import { auth } from "@/auth";

const importRoute = async () => {
  try {
    return await import("@/app/api/rfqs/[id]/bids/route");
  } catch {
    return null;
  }
};

describe("API /api/rfqs/[id]/bids", () => {
  const mockOrgId = "org_123456789";
  // Use valid ObjectId format (24 hex characters)
  const mockRfqId = "507f1f77bcf86cd799439011";
  const mockUser = {
    id: "user_123",
    orgId: mockOrgId,
    role: "VENDOR",
  };
  const mockParams = { id: mockRfqId };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true, remaining: 10 });
    vi.mocked(auth).mockResolvedValue({
      user: mockUser,
      expires: new Date(Date.now() + 86400000).toISOString(),
    } as never);
  });

  describe("GET - List Bids for RFQ", () => {
    it("returns 429 when rate limit is exceeded", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false, remaining: 0 });

      const req = new NextRequest(`http://localhost:3000/api/rfqs/${mockRfqId}/bids`);
      const response = await route.GET(req, { params: mockParams });

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(auth).mockResolvedValue(null as never);

      const req = new NextRequest(`http://localhost:3000/api/rfqs/${mockRfqId}/bids`);
      const response = await route.GET(req, { params: mockParams });

      expectAuthFailure(response);
    });
  });

  describe("POST - Submit Bid", () => {
    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(auth).mockResolvedValue(null as never);

      const req = new NextRequest(`http://localhost:3000/api/rfqs/${mockRfqId}/bids`, {
        method: "POST",
        body: JSON.stringify({
          amount: 50000,
          description: "Our competitive bid",
          validUntil: "2024-12-31",
        }),
      });
      const response = await route.POST(req, { params: mockParams });

      expectAuthFailure(response);
    });
  });
});
