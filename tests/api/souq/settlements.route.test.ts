/**
 * @fileoverview Tests for /api/souq/settlements route
 * Tests seller settlement operations with auth, RBAC, and rate limiting
 * 
 * Pattern: Static imports with mutable context variables (per TESTING_STRATEGY.md)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE (read by mock factories via closures)
// Pattern: Vitest pool:forks requires mutable state for mock configuration
// ============================================================================
type SessionUser = {
  id?: string;
  orgId?: string;
  role?: string;
  subRole?: string;
  isSuperAdmin?: boolean;
};
let sessionUser: SessionUser | null = null;
let mockRateLimitResponse: Response | null = null;

// Mock authentication
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => {
    if (!sessionUser) return null;
    return { user: sessionUser };
  }),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock rate limiting - reads mockRateLimitResponse via closure
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

// Mock Settlement model
vi.mock("@/server/models/souq/Settlement", () => ({
  SouqSettlement: {
    find: vi.fn().mockReturnValue({
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockResolvedValue([]),
  },
}));

// Mock AgentAuditLog model
vi.mock("@/server/models/AgentAuditLog", () => ({
  AgentAuditLog: {
    create: vi.fn(),
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Static import AFTER vi.mock declarations (Vitest hoists mocks)
import { GET } from "@/app/api/souq/settlements/route";

describe("API /api/souq/settlements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mutable state to defaults
    sessionUser = null;
    mockRateLimitResponse = null;
  });

  describe("GET - List Settlements", () => {
    it("returns 401 when user is not authenticated", async () => {
      sessionUser = null;
      mockRateLimitResponse = null;

      const req = new NextRequest("http://localhost:3000/api/souq/settlements");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limit exceeded", async () => {
      // Set authenticated user - rate limit check happens after auth
      sessionUser = {
        id: "user-123",
        orgId: "507f1f77bcf86cd799439011",
        role: "SELLER",
      };
      
      mockRateLimitResponse = new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429 }
      );

      const req = new NextRequest("http://localhost:3000/api/souq/settlements");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("returns 403 when orgId is missing", async () => {
      mockRateLimitResponse = null;
      sessionUser = { id: "user-123", role: "SELLER" };

      const req = new NextRequest("http://localhost:3000/api/souq/settlements");
      const res = await GET(req);

      expect(res.status).toBe(403);
    });

    // TODO(TG-005): Complete settlement DB mocks for deterministic test
    it.skip("returns settlements for authenticated seller", async () => {
      mockRateLimitResponse = null;
      sessionUser = {
        id: "user-123",
        orgId: "507f1f77bcf86cd799439011",
        role: "SELLER",
        subRole: "SELLER",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/souq/settlements?sellerId=seller-123"
      );
      const res = await GET(req);

      // Requires settlement DB mocks for 200 response
      expect(res.status).toBe(200);
    });

    it("requires targetOrgId for super admin without session org", async () => {
      mockRateLimitResponse = null;
      sessionUser = {
        id: "admin-123",
        role: "SUPER_ADMIN",
        isSuperAdmin: true,
      };

      const req = new NextRequest("http://localhost:3000/api/souq/settlements");
      const res = await GET(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("targetOrgId");
    });

    // TODO(TG-005): Complete settlement DB mocks for deterministic pagination test
    it.skip("supports pagination parameters", async () => {
      mockRateLimitResponse = null;
      sessionUser = {
        id: "user-123",
        orgId: "507f1f77bcf86cd799439011",
        role: "SELLER",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/souq/settlements?sellerId=s1&page=2&limit=20"
      );
      const res = await GET(req);

      // Requires settlement DB mocks to verify pagination
      expect(res.status).toBe(200);
    });

    // TODO(TG-005): Complete settlement DB mocks to verify status filter
    it.skip("supports status filter", async () => {
      mockRateLimitResponse = null;
      sessionUser = {
        id: "user-123",
        orgId: "507f1f77bcf86cd799439011",
        role: "ADMIN",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/souq/settlements?status=COMPLETED&sellerId=s1"
      );
      const res = await GET(req);

      // Requires settlement DB mocks to verify status filter applied
      expect(res.status).toBe(200);
    });
  });
});
