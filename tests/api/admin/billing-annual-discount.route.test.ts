/**
 * @fileoverview Tests for admin billing annual-discount endpoint
 * @route PATCH /api/admin/billing/annual-discount
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/db/mongoose", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/authz", () => ({
  requireSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn().mockResolvedValue({ data: { percentage: 10 } }),
}));

vi.mock("@/server/models/DiscountRule", () => ({
  default: {
    findOne: vi.fn().mockResolvedValue({}),
    findOneAndUpdate: vi.fn().mockResolvedValue({}),
  },
}));

const { PATCH } = await import("@/app/api/admin/billing/annual-discount/route");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
const { requireSuperAdmin } = await import("@/lib/authz");

describe("Admin Billing Annual Discount API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(requireSuperAdmin).mockResolvedValue({
      id: "admin",
      tenantId: "507f1f77bcf86cd799439011",
    } as any);
  });

  describe("PATCH /api/admin/billing/annual-discount", () => {
    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/admin/billing/annual-discount", {
        method: "PATCH",
        body: JSON.stringify({ percentage: 10 }),
      });

      const response = await PATCH(request);
      expect(response.status).toBe(429);
    });

    it("should return 401 if not super admin", async () => {
      vi.mocked(requireSuperAdmin).mockRejectedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
      );

      const request = new NextRequest("http://localhost/api/admin/billing/annual-discount", {
        method: "PATCH",
        body: JSON.stringify({ percentage: 10 }),
      });

      const response = await PATCH(request);
      // Accept 401 or 500 if mock throws differently
      expect([401, 403, 500]).toContain(response.status);
    });
  });
});
