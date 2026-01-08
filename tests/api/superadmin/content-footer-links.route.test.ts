/**
 * @fileoverview Tests for Superadmin Footer Links API
 * @route GET/POST /api/superadmin/content/footer-links
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

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(),
}));

vi.mock("@/server/plugins/tenantIsolation", () => ({
  setTenantContext: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Dynamic imports AFTER mocks
const { GET, POST } = await import("@/app/api/superadmin/content/footer-links/route");
const { FooterLink } = await import("@/server/models/FooterLink");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
const { parseBodySafe } = await import("@/lib/api/parse-body");

describe("Superadmin Footer Links API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
      orgId: "org-123",
    } as any);
  });

  describe("GET /api/superadmin/content/footer-links", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links");
      const response = await GET(request);

      expectAuthFailure(response);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links");
      const response = await GET(request);

      expect(response.status).toBe(429);
    });

    it("should return all footer links", async () => {
      vi.mocked(FooterLink.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { _id: "link-1", label: "About", section: "company", url: "/about" },
            { _id: "link-2", label: "Support", section: "support", url: "/support" },
          ]),
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.links).toHaveLength(2);
    });

    it("should filter links by section", async () => {
      vi.mocked(FooterLink.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { _id: "link-1", label: "Privacy", section: "legal", url: "/privacy" },
          ]),
        }),
      } as any);

      const request = new NextRequest(
        "http://localhost/api/superadmin/content/footer-links?section=legal"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(FooterLink.find).toHaveBeenCalledWith({ section: "legal" });
    });
  });

  describe("POST /api/superadmin/content/footer-links", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
        method: "POST",
        body: JSON.stringify({ label: "New Link" }),
      });
      const response = await POST(request);

      expectAuthFailure(response);
    });

    it("should create a new footer link", async () => {
      vi.mocked(parseBodySafe).mockResolvedValue({
        success: true,
        data: {
          label: "Contact Us",
          labelAr: "اتصل بنا",
          url: "/contact",
          section: "company",
          isActive: true,
        },
      } as any);

      vi.mocked(FooterLink.create).mockResolvedValue({
        _id: "new-link-id",
        label: "Contact Us",
        labelAr: "اتصل بنا",
        url: "/contact",
        section: "company",
        isActive: true,
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
        method: "POST",
        body: JSON.stringify({
          label: "Contact Us",
          labelAr: "اتصل بنا",
          url: "/contact",
          section: "company",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.link.label).toBe("Contact Us");
    });

    it("should validate required fields", async () => {
      vi.mocked(parseBodySafe).mockResolvedValue({
        success: false,
        error: { issues: [{ path: ["label"], message: "Label is required" }] },
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
        method: "POST",
        body: JSON.stringify({ url: "/test" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should validate section enum", async () => {
      vi.mocked(parseBodySafe).mockResolvedValue({
        success: false,
        error: { issues: [{ path: ["section"], message: "Invalid enum value" }] },
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/footer-links", {
        method: "POST",
        body: JSON.stringify({ label: "Test", url: "/test", section: "invalid" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
