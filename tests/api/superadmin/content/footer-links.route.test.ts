/**
 * @fileoverview Superadmin Footer Links API Tests
 * @description Tests for GET/POST /api/superadmin/content/footer-links
 *              and PUT/DELETE /api/superadmin/content/footer-links/[id]
 */
import { expectAuthFailure, expectValidationFailure, expectSuccess, expectRateLimited, expectNotFound } from '@/tests/api/_helpers';
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies BEFORE importing the routes
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/server/models/FooterLink", () => ({
  FooterLink: {
    find: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(),
}));

vi.mock("mongoose", async () => {
  const actual = await vi.importActual("mongoose");
  return {
    ...actual,
    isValidObjectId: vi.fn().mockImplementation((id: string) => {
      return /^[0-9a-fA-F]{24}$/.test(id);
    }),
  };
});

// Dynamic imports AFTER mocks are set up
const { GET, POST } = await import("@/app/api/superadmin/content/footer-links/route");
const { PUT, DELETE } = await import("@/app/api/superadmin/content/footer-links/[id]/route");
const { FooterLink } = await import("@/server/models/FooterLink");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
const { parseBodySafe } = await import("@/lib/api/parse-body");

describe("Superadmin Footer Links API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");

    // Default: rate limit allows requests
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  describe("GET /api/superadmin/content/footer-links", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links");
      const response = await GET(request);

      expectAuthFailure(response);
      const data = await response.json();
      expect(data.error).toContain("Unauthorized");
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links");
      const response = await GET(request);

      expectRateLimited(response);
    });

    it("should return all footer links", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(FooterLink.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { _id: "abc123", label: "About", section: "company", url: "/about" },
            { _id: "def456", label: "Help", section: "support", url: "/help" },
          ]),
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links");
      const response = await GET(request);

      expectSuccess(response);
      const data = await response.json();
      expect(data.links).toHaveLength(2);
    });

    it("should filter by section when provided", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(FooterLink.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { _id: "abc123", label: "About", section: "company", url: "/about" },
          ]),
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links?section=company");
      const response = await GET(request);

      expectSuccess(response);
      expect(FooterLink.find).toHaveBeenCalledWith({ section: "company" });
    });

    it("should return empty array when section=all", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(FooterLink.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links?section=all");
      const response = await GET(request);

      expectSuccess(response);
      expect(FooterLink.find).toHaveBeenCalledWith({});
    });
  });

  describe("POST /api/superadmin/content/footer-links", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
        method: "POST",
      });
      const response = await POST(request);

      expectAuthFailure(response);
    });

    it("should return 400 for missing required fields", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { label: "Test" }, // Missing url and section
        error: null,
      });

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
        method: "POST",
      });
      const response = await POST(request);

      expectValidationFailure(response);
    });

    it("should return 400 for invalid section", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { label: "Test", url: "/test", section: "invalid" },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
        method: "POST",
      });
      const response = await POST(request);

      expectValidationFailure(response);
    });

    it("should reject javascript: URLs (XSS prevention)", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { label: "XSS", url: "javascript:alert('xss')", section: "company" },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
        method: "POST",
      });
      const response = await POST(request);

      expectValidationFailure(response);
      const data = await response.json();
      expect(data.details[0].message).toContain("relative path");
    });

    it("should reject data: URLs (XSS prevention)", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { label: "XSS", url: "data:text/html,<script>alert(1)</script>", section: "company" },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
        method: "POST",
      });
      const response = await POST(request);

      expectValidationFailure(response);
    });

    it("should accept relative URLs starting with /", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { label: "About", url: "/about", section: "company" },
        error: null,
      });
      vi.mocked(FooterLink.create).mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        label: "About",
        url: "/about",
        section: "company",
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
        method: "POST",
      });
      const response = await POST(request);

      expectSuccess(response);
      expect(response.status).toBe(201);
    });

    it("should accept https URLs", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { label: "Twitter", url: "https://twitter.com/fixzit", section: "social", isExternal: true },
        error: null,
      });
      vi.mocked(FooterLink.create).mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        label: "Twitter",
        url: "https://twitter.com/fixzit",
        section: "social",
        isExternal: true,
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
        method: "POST",
      });
      const response = await POST(request);

      expectSuccess(response);
    });

    it("should create footer link with all fields", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: {
          label: "Privacy Policy",
          labelAr: "سياسة الخصوصية",
          url: "/privacy",
          section: "legal",
          icon: "shield",
          isExternal: false,
          isActive: true,
          sortOrder: 1,
        },
        error: null,
      });
      vi.mocked(FooterLink.create).mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        label: "Privacy Policy",
        labelAr: "سياسة الخصوصية",
        url: "/privacy",
        section: "legal",
        icon: "shield",
        sortOrder: 1,
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
        method: "POST",
      });
      const response = await POST(request);

      expectSuccess(response);
      const data = await response.json();
      expect(data.link.labelAr).toBe("سياسة الخصوصية");
    });
  });

  describe("PUT /api/superadmin/content/footer-links/[id]", () => {
    const validId = "507f1f77bcf86cd799439011";
    const invalidId = "invalid-id";

    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/superadmin/content/footer-links/${validId}`, {
        method: "PUT",
      });
      const response = await PUT(request, { params: Promise.resolve({ id: validId }) });

      expectAuthFailure(response);
    });

    it("should return 400 for invalid ObjectId", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);

      const request = new NextRequest(`http://localhost/api/superadmin/content/footer-links/${invalidId}`, {
        method: "PUT",
      });
      const response = await PUT(request, { params: Promise.resolve({ id: invalidId }) });

      expectValidationFailure(response);
      const data = await response.json();
      expect(data.error).toContain("Invalid link ID");
    });

    it("should return 404 if link not found", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { label: "Updated" },
        error: null,
      });
      vi.mocked(FooterLink.findByIdAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const request = new NextRequest(`http://localhost/api/superadmin/content/footer-links/${validId}`, {
        method: "PUT",
      });
      const response = await PUT(request, { params: Promise.resolve({ id: validId }) });

      expectNotFound(response);
    });

    it("should update link successfully", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { label: "Updated About" },
        error: null,
      });
      vi.mocked(FooterLink.findByIdAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: validId,
          label: "Updated About",
          url: "/about",
          section: "company",
        }),
      } as any);

      const request = new NextRequest(`http://localhost/api/superadmin/content/footer-links/${validId}`, {
        method: "PUT",
      });
      const response = await PUT(request, { params: Promise.resolve({ id: validId }) });

      expectSuccess(response);
      const data = await response.json();
      expect(data.link.label).toBe("Updated About");
    });

    it("should reject XSS URLs on update", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { url: "javascript:void(0)" },
        error: null,
      });

      const request = new NextRequest(`http://localhost/api/superadmin/content/footer-links/${validId}`, {
        method: "PUT",
      });
      const response = await PUT(request, { params: Promise.resolve({ id: validId }) });

      expectValidationFailure(response);
    });
  });

  describe("DELETE /api/superadmin/content/footer-links/[id]", () => {
    const validId = "507f1f77bcf86cd799439011";
    const invalidId = "invalid-id";

    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/superadmin/content/footer-links/${validId}`, {
        method: "DELETE",
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: validId }) });

      expectAuthFailure(response);
    });

    it("should return 400 for invalid ObjectId", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);

      const request = new NextRequest(`http://localhost/api/superadmin/content/footer-links/${invalidId}`, {
        method: "DELETE",
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: invalidId }) });

      expectValidationFailure(response);
    });

    it("should return 404 if link not found", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      // findByIdAndDelete returns a query with lean(), so mock the chain
      vi.mocked(FooterLink.findByIdAndDelete).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const request = new NextRequest(`http://localhost/api/superadmin/content/footer-links/${validId}`, {
        method: "DELETE",
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: validId }) });

      expectNotFound(response);
    });

    it("should delete link successfully", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(FooterLink.findByIdAndDelete).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: validId,
          label: "Deleted Link",
        }),
      } as any);

      const request = new NextRequest(`http://localhost/api/superadmin/content/footer-links/${validId}`, {
        method: "DELETE",
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: validId }) });

      expectSuccess(response);
      const data = await response.json();
      expect(data.message).toContain("deleted");
    });
  });
});
