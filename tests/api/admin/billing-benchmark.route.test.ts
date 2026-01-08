/**
 * @fileoverview Tests for admin billing benchmark endpoint
 * @route GET /api/admin/billing/benchmark
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  buildOrgAwareRateLimitKey: vi.fn().mockReturnValue("test-key"),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
  ),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((data, status) =>
    new Response(JSON.stringify(data), { status })
  ),
}));

vi.mock("@/lib/authz", () => ({
  requireSuperAdmin: vi.fn(),
}));

vi.mock("@/server/models/Benchmark", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
}));

const { GET } = await import("@/app/api/admin/billing/benchmark/route");
const { requireSuperAdmin } = await import("@/lib/authz");
const { smartRateLimit } = await import("@/server/security/rateLimit");

describe("Admin Billing Benchmark API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(requireSuperAdmin).mockResolvedValue({
      id: "admin",
      tenantId: "test-tenant",
    } as any);
  });

  describe("GET /api/admin/billing/benchmark", () => {
    it("should return 429 when rate limited", async () => {
      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false });

      const request = new NextRequest("http://localhost/api/admin/billing/benchmark");

      const response = await GET(request);
      expect(response.status).toBe(429);
    });

    it("should return 401 if not super admin", async () => {
      vi.mocked(requireSuperAdmin).mockRejectedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
      );

      const request = new NextRequest("http://localhost/api/admin/billing/benchmark");

      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });
});
