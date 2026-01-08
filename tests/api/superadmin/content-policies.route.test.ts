/**
 * @fileoverview Tests for Superadmin Content Policies API
 * @route GET/POST /api/superadmin/content/policies
 * @agent [AGENT-001-A]
 */
import { expectAuthFailure } from '@/tests/api/_helpers';
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies BEFORE importing the route
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/server/models/FooterContent", () => ({
  FooterContent: {
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Dynamic imports AFTER mocks
const { GET, POST } = await import("@/app/api/superadmin/content/policies/route");
const { FooterContent } = await import("@/server/models/FooterContent");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
const { parseBodySafe } = await import("@/lib/api/parse-body");

describe("Superadmin Content Policies API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
      orgId: "org-123",
    } as any);
  });

  describe("GET /api/superadmin/content/policies", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/content/policies");
      const response = await GET(request);

      expectAuthFailure(response);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/superadmin/content/policies");
      const response = await GET(request);

      expect(response.status).toBe(429);
    });

    it("should return all policies with transformed format", async () => {
      vi.mocked(FooterContent.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: "policy-1",
              page: "privacy",
              contentEn: "Privacy policy content",
              contentAr: "محتوى سياسة الخصوصية",
              updatedAt: new Date(),
            },
            {
              _id: "policy-2",
              page: "terms",
              contentEn: "Terms content",
              contentAr: "محتوى الشروط",
              updatedAt: new Date(),
            },
          ]),
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/policies");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.policies).toHaveLength(2);
      expect(data.policies[0].title).toBe("Privacy Policy");
      expect(data.policies[0].titleAr).toBe("سياسة الخصوصية");
      expect(data.policies[1].title).toBe("Terms of Service");
    });

    it("should return empty array when no policies exist", async () => {
      vi.mocked(FooterContent.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/policies");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.policies).toHaveLength(0);
    });
  });

  describe("POST /api/superadmin/content/policies", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/content/policies", {
        method: "POST",
        body: JSON.stringify({ page: "privacy", contentEn: "Test" }),
      });
      const response = await POST(request);

      expectAuthFailure(response);
    });

    it("should create or update a policy", async () => {
      vi.mocked(parseBodySafe).mockResolvedValue({
        success: true,
        data: {
          type: "privacy",
          content: "Updated privacy policy",
          contentAr: "سياسة الخصوصية المحدثة",
        },
      } as any);

      vi.mocked(FooterContent.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: "policy-1",
          page: "privacy",
          contentEn: "Updated privacy policy",
          contentAr: "سياسة الخصوصية المحدثة",
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/policies", {
        method: "POST",
        body: JSON.stringify({
          type: "privacy",
          content: "Updated privacy policy",
          contentAr: "سياسة الخصوصية المحدثة",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.policy.page).toBe("privacy");
    });

    it("should validate required fields", async () => {
      vi.mocked(parseBodySafe).mockResolvedValue({
        success: true,
        data: { type: "privacy" },  // Missing content and contentAr
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/policies", {
        method: "POST",
        body: JSON.stringify({ type: "privacy" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
