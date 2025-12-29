/**
 * @fileoverview Tests for /api/issues/stats route
 * Tests stats aggregation and tenant isolation
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock dependencies before imports
const mockConnectToDatabase = vi.fn().mockResolvedValue(undefined);
const mockIssueAggregate = vi.fn();
const mockGetSessionOrNull = vi.fn();
const mockGetSuperadminSession = vi.fn();
const mockEnforceRateLimit = vi.fn();

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: () => mockConnectToDatabase(),
}));

vi.mock("@/server/models/Issue", () => ({
  Issue: {
    aggregate: (...args: unknown[]) => mockIssueAggregate(...args),
  },
  IssuePriority: {
    P0: "P0",
    P1: "P1",
    P2: "P2",
    P3: "P3",
  },
  IssueStatus: {
    OPEN: "OPEN",
    IN_PROGRESS: "IN_PROGRESS",
    RESOLVED: "RESOLVED",
    CLOSED: "CLOSED",
  },
  IssueEffort: {
    XS: "XS",
    S: "S",
    M: "M",
    L: "L",
    XL: "XL",
  },
}));

vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: (...args: unknown[]) => mockGetSessionOrNull(...args),
}));

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: (...args: unknown[]) => mockGetSuperadminSession(...args),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("mongoose", () => ({
  default: {
    isValidObjectId: vi.fn().mockReturnValue(true),
    Types: {
      ObjectId: vi.fn().mockImplementation((id) => ({ toString: () => id, _id: id })),
    },
  },
}));

import { GET } from "@/app/api/issues/stats/route";
import { NextRequest } from "next/server";

function createRequest(): NextRequest {
  return new NextRequest("http://localhost/api/issues/stats", {
    method: "GET",
    headers: { "x-forwarded-for": "127.0.0.1" },
  });
}

const mockSession = {
  id: "user-1",
  email: "admin@example.com",
  role: "ADMIN",
  orgId: "507f1f77bcf86cd799439011",
  isSuperAdmin: false,
};

describe("/api/issues/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
    mockGetSuperadminSession.mockResolvedValue(null);
    mockConnectToDatabase.mockResolvedValue(undefined);
    
    // Default aggregate mock - returns empty arrays for all aggregations
    mockIssueAggregate.mockResolvedValue([]);
  });

  describe("GET /api/issues/stats", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetSessionOrNull.mockResolvedValueOnce({ ok: true, session: null });

      const req = createRequest();
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin roles", async () => {
      mockGetSessionOrNull.mockResolvedValueOnce({
        ok: true,
        session: { ...mockSession, role: "TENANT" },
      });

      const req = createRequest();
      const res = await GET(req);

      expect(res.status).toBe(403);
    });

    it("returns stats for admin users", async () => {
      mockGetSessionOrNull.mockResolvedValueOnce({
        ok: true,
        session: mockSession,
      });

      const req = createRequest();
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      // Stats should include various breakdowns
      expect(body).toBeDefined();
    });

    it("returns 400 for invalid orgId", async () => {
      const mongoose = await import("mongoose");
      vi.mocked(mongoose.default.isValidObjectId).mockReturnValueOnce(false);

      mockGetSessionOrNull.mockResolvedValueOnce({
        ok: true,
        session: { ...mockSession, orgId: "invalid" },
      });

      const req = createRequest();
      const res = await GET(req);

      expect(res.status).toBe(400);
    });

    it("returns 429 when rate limited", async () => {
      const rateLimitResponse = new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429,
      });
      mockEnforceRateLimit.mockReturnValueOnce(rateLimitResponse);

      const req = createRequest();
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("allows superadmin access", async () => {
      mockGetSuperadminSession.mockResolvedValueOnce({
        username: "superadmin@test.com",
        orgId: "507f1f77bcf86cd799439011",
        role: "super_admin",
      });

      const req = createRequest();
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("uses orgId filter in aggregation for tenant isolation", async () => {
      mockGetSessionOrNull.mockResolvedValueOnce({
        ok: true,
        session: mockSession,
      });

      const req = createRequest();
      await GET(req);

      // Verify aggregate was called with orgId in $match
      expect(mockIssueAggregate).toHaveBeenCalled();
      const aggregateCalls = mockIssueAggregate.mock.calls;
      
      // Check that at least one aggregation includes orgId filter
      const hasOrgIdFilter = aggregateCalls.some((call) => {
        const pipeline = call[0];
        return pipeline?.some((stage: Record<string, unknown>) => {
          const match = stage.$match as Record<string, unknown> | undefined;
          return match?.orgId !== undefined;
        });
      });
      
      expect(hasOrgIdFilter).toBe(true);
    });
  });
});
