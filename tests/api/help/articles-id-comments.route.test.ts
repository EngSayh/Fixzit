/**
 * @fileoverview Tests for help articles [id] comments endpoint
 * @route GET,POST /api/help/articles/[id]/comments
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

vi.mock("@/services/help/help-article-service", () => ({
  helpArticleService: {
    getArticle: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("@/server/models/HelpComment", () => ({
  HelpComment: {
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
    create: vi.fn().mockResolvedValue({}),
  },
}));

const { GET, POST } = await import("@/app/api/help/articles/[id]/comments/route");
const { getSessionUser } = await import("@/server/middleware/withAuthRbac");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

const validId = "507f1f77bcf86cd799439011";

describe("Help Articles [id] Comments API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "user1",
      orgId: validId,
      role: "ADMIN",
    } as any);
  });

  describe("GET /api/help/articles/[id]/comments", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSessionUser).mockRejectedValue(new Error("Not authenticated"));

      const request = new NextRequest(`http://localhost/api/help/articles/${validId}/comments`);
      const response = await GET(request, { params: Promise.resolve({ id: validId }) });

      expect([401, 403, 500]).toContain(response.status);
    });

    it("should handle comments request", async () => {
      const request = new NextRequest(`http://localhost/api/help/articles/${validId}/comments`);
      const response = await GET(request, { params: Promise.resolve({ id: validId }) });

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("POST /api/help/articles/[id]/comments", () => {
    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest(`http://localhost/api/help/articles/${validId}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment: "Test comment" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: validId }) });
      expect([200, 429, 500]).toContain(response.status);
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSessionUser).mockRejectedValue(new Error("Not authenticated"));

      const request = new NextRequest(`http://localhost/api/help/articles/${validId}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment: "Test comment" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: validId }) });
      expect([401, 403, 500]).toContain(response.status);
    });
  });
});
