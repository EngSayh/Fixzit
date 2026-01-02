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
const { findMock, countDocumentsMock } = vi.hoisted(() => ({
  findMock: vi.fn(),
  countDocumentsMock: vi.fn(),
}));

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
    find: findMock.mockReturnValue({
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: countDocumentsMock.mockResolvedValue(0),
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

    it("returns settlements for authenticated seller", async () => {
      mockRateLimitResponse = null;
      sessionUser = {
        id: "user-123",
        orgId: "507f1f77bcf86cd799439011",
        role: "SELLER",
        subRole: "SELLER",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/souq/settlements?sellerId=user-123"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(findMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sellerId: "user-123",
          orgId: "507f1f77bcf86cd799439011",
        }),
      );
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

    it("supports pagination parameters", async () => {
      mockRateLimitResponse = null;
      sessionUser = {
        id: "user-123",
        orgId: "507f1f77bcf86cd799439011",
        role: "ADMIN",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/souq/settlements?sellerId=s1&page=2&limit=20"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(findMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sellerId: "s1",
          orgId: "507f1f77bcf86cd799439011",
        }),
      );
    });

    it("supports status filter", async () => {
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

      expect(res.status).toBe(200);
      expect(findMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sellerId: "s1",
          orgId: "507f1f77bcf86cd799439011",
          status: "COMPLETED",
        }),
      );
      expect(countDocumentsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sellerId: "s1",
          orgId: "507f1f77bcf86cd799439011",
          status: "COMPLETED",
        }),
      );
    });
  });
});
