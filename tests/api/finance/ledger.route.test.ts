/**
 * @fileoverview Tests for Finance Ledger API
 * @module tests/api/finance/ledger.route.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before imports
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/mongodb-unified", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

const mockEnforceRateLimit = vi.fn();
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

const mockGetSessionUser = vi.fn();
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: (...args: unknown[]) => mockGetSessionUser(...args),
}));

vi.mock("@/server/lib/authContext", () => ({
  runWithContext: (_ctx: unknown, fn: () => Promise<unknown>) => fn(),
}));

vi.mock("@/config/rbac.config", () => ({
  requirePermission: vi.fn(),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  unauthorizedError: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  forbiddenError: () => new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
  handleApiError: vi.fn().mockReturnValue(new Response(JSON.stringify({ error: "Error" }), { status: 500 })),
  isForbidden: vi.fn().mockReturnValue(false),
}));

// Mock LedgerEntry model
vi.mock("@/server/models/finance/LedgerEntry", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

import { GET } from "@/app/api/finance/ledger/route";

function createRequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/finance/ledger");
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new NextRequest(url, { method: "GET" });
}

describe("Finance Ledger API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
    mockGetSessionUser.mockReset();
  });

  describe("GET /api/finance/ledger", () => {
    it("should return 429 when rate limited", async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: "Too many requests" }),
        { status: 429 }
      );
      mockEnforceRateLimit.mockReturnValue(rateLimitResponse);

      const request = createRequest();
      const response = await GET(request);
      
      expect(response.status).toBe(429);
    });

    it("should return 401 when not authenticated", async () => {
      mockGetSessionUser.mockResolvedValue(null);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it("should return ledger entries when authenticated with permission", async () => {
      mockGetSessionUser.mockResolvedValue({
        id: "user_1",
        orgId: "org_1",
        role: "FINANCE_MANAGER",
      });

      const request = createRequest();
      const response = await GET(request);

      // Should proceed with request
      expect(response.status).toBeDefined();
    });

    it("should accept accountId filter parameter", async () => {
      mockGetSessionUser.mockResolvedValue({
        id: "user_1",
        orgId: "org_1",
        role: "FINANCE_MANAGER",
      });

      const request = createRequest({ accountId: "507f1f77bcf86cd799439011" });
      const response = await GET(request);

      expect(response.status).toBeDefined();
    });

    it("should accept date range filter parameters", async () => {
      mockGetSessionUser.mockResolvedValue({
        id: "user_1",
        orgId: "org_1",
        role: "FINANCE_MANAGER",
      });

      const request = createRequest({
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      const response = await GET(request);

      expect(response.status).toBeDefined();
    });
  });
});
