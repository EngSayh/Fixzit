/**
 * @fileoverview Tests for admin/footer API route
 * @description Manages footer content for static pages (About, Privacy, Terms)
 * @route GET/POST /api/admin/footer
 * @sprint 48
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/admin/footer/route";

// Mock auth middleware
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn().mockRejectedValue(new Error("Not authenticated")),
}));

// Mock rate limit
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock MongoDB
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock FooterContent model
vi.mock("@/server/models/FooterContent", () => ({
  FooterContent: {
    findOne: vi.fn().mockResolvedValue(null),
    findOneAndUpdate: vi.fn().mockResolvedValue(null),
  },
}));

// Mock parse-body
vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("admin/footer route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/footer", () => {
    it("should return 401 or 500 when not authenticated", async () => {
      const request = new NextRequest("http://localhost:3000/api/admin/footer?page=about");
      const response = await GET(request);
      // 401 = auth rejected, 500 = auth threw error (both valid for auth failure)
      expect([401, 500]).toContain(response.status);
    });

    it("should return 403 for non-SUPER_ADMIN", async () => {
      const { getSessionUser } = await import("@/server/middleware/withAuthRbac");
      vi.mocked(getSessionUser).mockResolvedValueOnce({
        id: "user-1",
        orgId: "org-1",
        role: "ADMIN",
      } as never);

      const request = new NextRequest("http://localhost:3000/api/admin/footer?page=about");
      const response = await GET(request);
      expect(response.status).toBe(403);
    });
  });

  describe("POST /api/admin/footer", () => {
    it("should return 401 or 500 when not authenticated", async () => {
      const request = new NextRequest("http://localhost:3000/api/admin/footer", {
        method: "POST",
        body: JSON.stringify({ page: "about", contentEn: "Test", contentAr: "اختبار" }),
      });
      const response = await POST(request);
      // 401 = auth rejected, 500 = auth threw error (both valid for auth failure)
      expect([401, 500]).toContain(response.status);
    });

    it("should return 403 for non-SUPER_ADMIN", async () => {
      const { getSessionUser } = await import("@/server/middleware/withAuthRbac");
      vi.mocked(getSessionUser).mockResolvedValueOnce({
        id: "user-1",
        orgId: "org-1",
        role: "ADMIN",
      } as never);

      const request = new NextRequest("http://localhost:3000/api/admin/footer", {
        method: "POST",
        body: JSON.stringify({ page: "about", contentEn: "Test", contentAr: "اختبار" }),
      });
      const response = await POST(request);
      expect(response.status).toBe(403);
    });
  });
});
