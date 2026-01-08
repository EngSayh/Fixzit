/**
 * @fileoverview Tests for Superadmin Company Info API
 * @route GET/PUT /api/superadmin/content/company
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

vi.mock("@/server/models/CompanyInfo", () => ({
  CompanyInfo: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
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
const { GET, PUT } = await import("@/app/api/superadmin/content/company/route");
const { CompanyInfo } = await import("@/server/models/CompanyInfo");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
const { parseBodySafe } = await import("@/lib/api/parse-body");

describe("Superadmin Company Info API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
      orgId: "org-123",
    } as any);
  });

  describe("GET /api/superadmin/content/company", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/content/company");
      const response = await GET(request);

      expectAuthFailure(response);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/superadmin/content/company");
      const response = await GET(request);

      expect(response.status).toBe(429);
    });

    it("should return default company info when none exists", async () => {
      vi.mocked(CompanyInfo.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/company");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe("Fixzit");
      expect(data.nameAr).toBe("فكسزت");
    });

    it("should return existing company info", async () => {
      vi.mocked(CompanyInfo.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          name: "Custom Company",
          nameAr: "شركة مخصصة",
          email: "custom@example.com",
          phone: "+966 50 000 0000",
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/company");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe("Custom Company");
      expect(data.email).toBe("custom@example.com");
    });
  });

  describe("PUT /api/superadmin/content/company", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/content/company", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Company" }),
      });
      const response = await PUT(request);

      expectAuthFailure(response);
    });

    it("should update company info", async () => {
      vi.mocked(parseBodySafe).mockResolvedValue({
        success: true,
        data: { name: "Updated Company", phone: "+966 55 000 0000" },
      } as any);

      vi.mocked(CompanyInfo.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          name: "Updated Company",
          phone: "+966 55 000 0000",
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/company", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Company", phone: "+966 55 000 0000" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await PUT(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe("Updated Company");
    });

    it("should validate email format", async () => {
      vi.mocked(parseBodySafe).mockResolvedValue({
        success: false,
        error: { issues: [{ path: ["email"], message: "Invalid email" }] },
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/company", {
        method: "PUT",
        body: JSON.stringify({ email: "invalid-email" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await PUT(request);

      expect(response.status).toBe(400);
    });

    it("should update social links", async () => {
      vi.mocked(parseBodySafe).mockResolvedValue({
        success: true,
        data: {
          socialLinks: {
            twitter: "https://twitter.com/company",
            linkedin: "https://linkedin.com/company/company",
          },
        },
      } as any);

      vi.mocked(CompanyInfo.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          socialLinks: {
            twitter: "https://twitter.com/company",
            linkedin: "https://linkedin.com/company/company",
          },
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/company", {
        method: "PUT",
        body: JSON.stringify({
          socialLinks: {
            twitter: "https://twitter.com/company",
            linkedin: "https://linkedin.com/company/company",
          },
        }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await PUT(request);

      expect(response.status).toBe(200);
    });
  });
});
