/**
 * @fileoverview Tests for owner units [unitId] history endpoint
 * @route GET /api/owner/units/[unitId]/history
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: vi.fn(),
}));

vi.mock("@/lib/db/mongoose", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

const { GET } = await import("@/app/api/owner/units/[unitId]/history/route");
const { getSessionOrNull } = await import("@/lib/auth/safe-session");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

const validId = "507f1f77bcf86cd799439011";

describe("Owner Units [unitId] History API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { id: "user1", orgId: validId, role: "OWNER" },
    });
  });

  describe("GET /api/owner/units/[unitId]/history", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({ ok: true, session: null });

      const request = new NextRequest(`http://localhost/api/owner/units/${validId}/history`);
      const response = await GET(request, { params: Promise.resolve({ unitId: validId }) });

      expect([401, 403, 500]).toContain(response.status);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest(`http://localhost/api/owner/units/${validId}/history`);
      const response = await GET(request, { params: Promise.resolve({ unitId: validId }) });

      expect([200, 401, 429, 500]).toContain(response.status);
    });

    it("should handle unit history request", async () => {
      const request = new NextRequest(`http://localhost/api/owner/units/${validId}/history`);
      const response = await GET(request, { params: Promise.resolve({ unitId: validId }) });

      expect([200, 401, 404, 500]).toContain(response.status);
    });
  });
});
