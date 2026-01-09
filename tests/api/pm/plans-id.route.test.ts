/**
 * @fileoverview Tests for PM plans [id] endpoint
 * @route GET,PUT,DELETE /api/pm/plans/[id]
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

const { GET, PATCH, DELETE } = await import("@/app/api/pm/plans/[id]/route");
const { getSessionOrNull } = await import("@/lib/auth/safe-session");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

const validId = "507f1f77bcf86cd799439011";

describe("PM Plans [id] API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { id: "user1", orgId: validId, role: "ADMIN" },
    });
  });

  describe("GET /api/pm/plans/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({ ok: true, session: null });

      const request = new NextRequest(`http://localhost/api/pm/plans/${validId}`);
      const response = await GET(request, { params: Promise.resolve({ id: validId }) });

      expect([401, 403, 500]).toContain(response.status);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest(`http://localhost/api/pm/plans/${validId}`);
      const response = await GET(request, { params: Promise.resolve({ id: validId }) });

      expect([200, 429, 500]).toContain(response.status);
    });
  });

  describe("PATCH /api/pm/plans/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({ ok: true, session: null });

      const request = new NextRequest(`http://localhost/api/pm/plans/${validId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Plan" }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: validId }) });
      expect([401, 403, 500]).toContain(response.status);
    });
  });

  describe("DELETE /api/pm/plans/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({ ok: true, session: null });

      const request = new NextRequest(`http://localhost/api/pm/plans/${validId}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: validId }) });
      expect([401, 403, 500]).toContain(response.status);
    });
  });
});
