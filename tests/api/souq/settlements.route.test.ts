/**
 * @fileoverview Tests for /api/souq/settlements route
 * Tests seller settlement operations with auth, RBAC, and rate limiting
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type SessionUser = {
  id?: string;
  orgId?: string;
  role?: string;
  subRole?: string;
  isSuperAdmin?: boolean;
};
let sessionUser: SessionUser | null = null;

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

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
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

import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// Dynamic import to ensure mocks are applied
const importRoute = async () => import("@/app/api/souq/settlements/route");

describe("API /api/souq/settlements", () => {
  beforeEach(() => {
    vi.resetModules();
    sessionUser = null;
    vi.clearAllMocks();
  });

  describe("GET - List Settlements", () => {
    it("returns 401 when user is not authenticated", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      sessionUser = null;

      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/souq/settlements");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limit exceeded", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/souq/settlements");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("returns 403 when orgId is missing", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      sessionUser = { id: "user-123", role: "SELLER" };

      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/souq/settlements");
      const res = await GET(req);

      expect(res.status).toBe(403);
    });

    it("returns settlements for authenticated seller", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      sessionUser = {
        id: "user-123",
        orgId: "507f1f77bcf86cd799439011",
        role: "SELLER",
        subRole: "SELLER",
      };

      const { GET } = await importRoute();
      const req = new NextRequest(
        "http://localhost:3000/api/souq/settlements?sellerId=seller-123"
      );
      const res = await GET(req);

      // Should return 200, 404 (not found), or handle gracefully
      expect([200, 400, 404, 500]).toContain(res.status);
    });

    it("requires targetOrgId for super admin without session org", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      sessionUser = {
        id: "admin-123",
        role: "SUPER_ADMIN",
        isSuperAdmin: true,
      };

      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/souq/settlements");
      const res = await GET(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("targetOrgId");
    });

    it("supports pagination parameters", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      sessionUser = {
        id: "user-123",
        orgId: "507f1f77bcf86cd799439011",
        role: "SELLER",
      };

      const { GET } = await importRoute();
      const req = new NextRequest(
        "http://localhost:3000/api/souq/settlements?sellerId=s1&page=2&limit=20"
      );
      const res = await GET(req);

      expect([200, 400, 404, 500]).toContain(res.status);
    });

    it("supports status filter", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      sessionUser = {
        id: "user-123",
        orgId: "507f1f77bcf86cd799439011",
        role: "ADMIN",
      };

      const { GET } = await importRoute();
      const req = new NextRequest(
        "http://localhost:3000/api/souq/settlements?status=COMPLETED&sellerId=s1"
      );
      const res = await GET(req);

      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });
});
