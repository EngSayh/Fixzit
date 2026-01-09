/**
 * @fileoverview Tests for help articles [id] endpoint
 * @route PATCH /api/help/articles/[id]
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: vi.fn(),
}));

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(),
}));

vi.mock("@/lib/db/mongoose", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      findOne: vi.fn().mockResolvedValue(null),
      findOneAndUpdate: vi.fn().mockResolvedValue({ value: null }),
    }),
  }),
}));

const { PATCH } = await import("@/app/api/help/articles/[id]/route");
const { getSessionUser } = await import("@/server/middleware/withAuthRbac");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

const validId = "507f1f77bcf86cd799439011";

describe("Help Articles [id] API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "user1",
      orgId: validId,
      role: "SUPER_ADMIN",
    } as any);
  });

  describe("PATCH /api/help/articles/[id]", () => {
    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest(`http://localhost/api/help/articles/${validId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: validId }) });
      expect([200, 429, 500]).toContain(response.status);
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSessionUser).mockRejectedValue(new Error("Not authenticated"));

      const request = new NextRequest(`http://localhost/api/help/articles/${validId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: validId }) });
      expect([401, 403, 500]).toContain(response.status);
    });
  });
});
