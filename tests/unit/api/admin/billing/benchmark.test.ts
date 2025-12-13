/**
 * @fileoverview Tests for Admin Billing Benchmark API
 * @route GET /api/admin/billing/benchmark
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
const mockFind = vi.fn();

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn(async () => ({})),
}));

vi.mock("@/server/models/Benchmark", () => ({
  default: {
    find: (...args: unknown[]) => mockFind(...args),
  },
}));

vi.mock("@/server/security/rateLimit", () => ({
  buildOrgAwareRateLimitKey: vi.fn(() => "test-key"),
  smartRateLimit: vi.fn(async () => ({ allowed: true, remaining: 99 })),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() =>
    new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 }),
  ),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((data: unknown, status: number) =>
    new Response(JSON.stringify(data), { status }),
  ),
}));

let mockAuthResult: { id: string; tenantId: string } | null = null;
let mockAuthError: unknown = null;

vi.mock("@/lib/authz", () => ({
  requireSuperAdmin: vi.fn(async () => {
    if (mockAuthError) throw mockAuthError;
    return mockAuthResult;
  }),
}));

const ORG_ID = "507f1f77bcf86cd799439011";
const ADMIN_ID = "507f1f77bcf86cd799439012";

function createRequest(): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/admin/billing/benchmark",
    {
      method: "GET",
    },
  );
}

describe("/api/admin/billing/benchmark", () => {
  let GET: typeof import("@/app/api/admin/billing/benchmark/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuthResult = null;
    mockAuthError = null;

    mockFind.mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    });

    const mod = await import("@/app/api/admin/billing/benchmark/route");
    GET = mod.GET;
  });

  describe("Authentication", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuthError = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

      const res = await GET(createRequest());
      expect(res.status).toBe(401);
    });

    it("returns 401 when requireSuperAdmin throws non-Response error", async () => {
      mockAuthError = new Error("Auth failed");

      const res = await GET(createRequest());
      expect(res.status).toBe(401);
    });
  });

  describe("Authorization", () => {
    it("returns 400 when tenantId is missing", async () => {
      mockAuthResult = { id: ADMIN_ID, tenantId: "" };

      const res = await GET(createRequest());
      expect(res.status).toBe(400);
    });

    it("returns 400 when tenantId is whitespace only", async () => {
      mockAuthResult = { id: ADMIN_ID, tenantId: "   " };

      const res = await GET(createRequest());
      expect(res.status).toBe(400);
    });
  });

  describe("Tenant Isolation", () => {
    it("scopes benchmark query by tenantId", async () => {
      mockAuthResult = { id: ADMIN_ID, tenantId: ORG_ID };
      mockFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ _id: "bench1", name: "Market Rate" }]),
      });

      await GET(createRequest());

      expect(mockFind).toHaveBeenCalledWith({ tenantId: ORG_ID });
    });

    it("returns only benchmarks for the authenticated tenant", async () => {
      mockAuthResult = { id: ADMIN_ID, tenantId: ORG_ID };
      const benchmarks = [
        { _id: "bench1", name: "Market Rate", tenantId: ORG_ID },
        { _id: "bench2", name: "Premium Rate", tenantId: ORG_ID },
      ];
      mockFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue(benchmarks),
      });

      const res = await GET(createRequest());
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveLength(2);
    });
  });

  describe("Success Response", () => {
    it("returns 200 with benchmarks array", async () => {
      mockAuthResult = { id: ADMIN_ID, tenantId: ORG_ID };
      mockFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      const res = await GET(createRequest());
      expect(res.status).toBe(200);
    });

    it("returns empty array when no benchmarks exist", async () => {
      mockAuthResult = { id: ADMIN_ID, tenantId: ORG_ID };
      mockFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      const res = await GET(createRequest());
      const body = await res.json();
      expect(body).toEqual([]);
    });
  });

  describe("Rate Limiting", () => {
    it("uses org-aware rate limit key", async () => {
      const { buildOrgAwareRateLimitKey } = await import("@/server/security/rateLimit");
      mockAuthResult = { id: ADMIN_ID, tenantId: ORG_ID };
      mockFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      await GET(createRequest());

      expect(buildOrgAwareRateLimitKey).toHaveBeenCalled();
    });
  });
});
