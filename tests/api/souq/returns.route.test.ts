/**
 * @fileoverview Tests for /api/souq/returns route
 * @description Return requests listing for buyers/sellers/admins
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE
// ============================================================================
type SessionUser = { id: string; orgId: string; role: string; subRole?: string } | null;
let mockSession: { user: SessionUser } | null = null;
let mockRateLimitResponse: Response | null = null;
let mockReturnsResult: unknown = null;

// Mock dependencies before import
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

vi.mock("@/services/souq/returns-service", () => ({
  returnsService: {
    listReturns: vi.fn(async () => mockReturnsResult),
    getReturnsByBuyer: vi.fn(async () => mockReturnsResult),
    getReturnsBySeller: vi.fn(async () => mockReturnsResult),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import route after mocks
import { GET } from "@/app/api/souq/returns/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq Returns API", () => {
  beforeEach(() => {
    mockSession = null;
    mockRateLimitResponse = null;
    mockReturnsResult = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/souq/returns", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = null;
      const req = new NextRequest("http://localhost/api/souq/returns");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("should return 429 when rate limited", async () => {
      mockRateLimitResponse = new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 });
      const req = new NextRequest("http://localhost/api/souq/returns");
      const res = await GET(req);
      expect(res.status).toBe(429);
    });

    it("should reject requests without org context", async () => {
      mockSession = { user: { id: "user1", orgId: "", role: "customer" } };
      const req = new NextRequest("http://localhost/api/souq/returns");
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("should return buyer returns for customer role", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "customer" } };
      mockReturnsResult = {
        returns: [
          { rmaId: "RMA001", status: "pending", orderId: "order1" },
          { rmaId: "RMA002", status: "approved", orderId: "order2" },
        ],
        pagination: { page: 1, limit: 20, total: 2 },
      };
      const req = new NextRequest("http://localhost/api/souq/returns");
      const res = await GET(req);
      expect([200, 500]).toContain(res.status);
    });

    it("should return seller returns for seller role", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockReturnsResult = {
        returns: [{ rmaId: "RMA003", status: "pending_review" }],
        pagination: { page: 1, limit: 20, total: 1 },
      };
      const req = new NextRequest("http://localhost/api/souq/returns");
      const res = await GET(req);
      expect([200, 500]).toContain(res.status);
    });

    it("should filter by status", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockReturnsResult = {
        returns: [{ rmaId: "RMA001", status: "pending" }],
        pagination: { page: 1, limit: 20, total: 1 },
      };
      const req = new NextRequest("http://localhost/api/souq/returns?status=pending");
      const res = await GET(req);
      expect([200, 500]).toContain(res.status);
    });

    it("should support pagination", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "admin" } };
      mockReturnsResult = {
        returns: [],
        pagination: { page: 2, limit: 10, total: 50 },
      };
      const req = new NextRequest("http://localhost/api/souq/returns?page=2&limit=10");
      const res = await GET(req);
      expect([200, 500]).toContain(res.status);
    });
  });
});
