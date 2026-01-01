/**
 * @fileoverview Superadmin Company Info API Tests
 * @description Tests for GET/PUT /api/superadmin/content/company
 */
import { expectAuthFailure, expectValidationFailure, expectSuccess, expectRateLimited } from '@/tests/api/_helpers';
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

// Dynamic imports AFTER mocks are set up
const { GET, PUT } = await import("@/app/api/superadmin/content/company/route");
const { CompanyInfo } = await import("@/server/models/CompanyInfo");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
const { parseBodySafe } = await import("@/lib/api/parse-body");

describe("Superadmin Company Info API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");

    // Default: rate limit allows requests
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  describe("GET /api/superadmin/content/company", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/content/company");
      const response = await GET(request);

      expectAuthFailure(response);
      const data = await response.json();
      expect(data.error).toContain("Unauthorized");
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/superadmin/content/company");
      const response = await GET(request);

      expectRateLimited(response);
    });

    it("should return default company info when none exists", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(CompanyInfo.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/company");
      const response = await GET(request);

      expectSuccess(response);
      const data = await response.json();
      expect(data.name).toBe("Fixzit");
      expect(data.nameAr).toBe("فكسزت");
      expect(data.email).toBe("support@fixzit.com");
    });

    it("should return existing company info", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(CompanyInfo.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          name: "Custom Company",
          email: "custom@example.com",
          phone: "+966501234567",
          vatNumber: "300123456789012",
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/company");
      const response = await GET(request);

      expectSuccess(response);
      const data = await response.json();
      expect(data.name).toBe("Custom Company");
      expect(data.vatNumber).toBe("300123456789012");
    });

    it("should include X-Robots-Tag header", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(CompanyInfo.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/company");
      const response = await GET(request);

      expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    });
  });

  describe("PUT /api/superadmin/content/company", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/content/company", {
        method: "PUT",
      });
      const response = await PUT(request);

      expectAuthFailure(response);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/superadmin/content/company", {
        method: "PUT",
      });
      const response = await PUT(request);

      expectRateLimited(response);
    });

    it("should return 400 for invalid JSON body", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: null,
        error: "Invalid JSON",
      });

      const request = new NextRequest("http://localhost/api/superadmin/content/company", {
        method: "PUT",
      });
      const response = await PUT(request);

      expectValidationFailure(response);
    });

    it("should return 400 for invalid email", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { email: "not-an-email" },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/superadmin/content/company", {
        method: "PUT",
      });
      const response = await PUT(request);

      expectValidationFailure(response);
    });

    it("should return 400 for name exceeding max length", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { name: "x".repeat(201) }, // Exceeds 200 char limit
        error: null,
      });

      const request = new NextRequest("http://localhost/api/superadmin/content/company", {
        method: "PUT",
      });
      const response = await PUT(request);

      expectValidationFailure(response);
    });

    it("should update company info successfully", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: {
          name: "Updated Company",
          email: "new@example.com",
          vatNumber: "300987654321098",
        },
        error: null,
      });
      vi.mocked(CompanyInfo.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          name: "Updated Company",
          email: "new@example.com",
          vatNumber: "300987654321098",
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/company", {
        method: "PUT",
      });
      const response = await PUT(request);

      expectSuccess(response);
      const data = await response.json();
      // Route returns spread of companyInfo, not nested object
      expect(data.name).toBe("Updated Company");
    });

    it("should handle socialLinks object", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: {
          socialLinks: {
            twitter: "https://twitter.com/fixzit",
            facebook: "https://facebook.com/fixzit",
          },
        },
        error: null,
      });
      vi.mocked(CompanyInfo.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          socialLinks: {
            twitter: "https://twitter.com/fixzit",
            facebook: "https://facebook.com/fixzit",
          },
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/company", {
        method: "PUT",
      });
      const response = await PUT(request);

      expectSuccess(response);
      const data = await response.json();
      // Route returns spread of companyInfo, not nested object
      expect(data.socialLinks.twitter).toBe("https://twitter.com/fixzit");
    });

    it("should reject invalid social link URLs", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: {
          socialLinks: {
            twitter: "not-a-url",
          },
        },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/superadmin/content/company", {
        method: "PUT",
      });
      const response = await PUT(request);

      expectValidationFailure(response);
    });

    it("should accept empty logoUrl", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: {
          logoUrl: "", // Allow clearing logo
        },
        error: null,
      });
      vi.mocked(CompanyInfo.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          logoUrl: "",
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/company", {
        method: "PUT",
      });
      const response = await PUT(request);

      expectSuccess(response);
    });

    it("should include i18n Arabic fields", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
      vi.mocked(parseBodySafe).mockResolvedValue({
        data: {
          nameAr: "شركة اختبار",
          taglineAr: "شعار اختبار",
          addressAr: "عنوان اختبار",
        },
        error: null,
      });
      vi.mocked(CompanyInfo.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          nameAr: "شركة اختبار",
          taglineAr: "شعار اختبار",
          addressAr: "عنوان اختبار",
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/content/company", {
        method: "PUT",
      });
      const response = await PUT(request);

      expectSuccess(response);
      const data = await response.json();
      // Route returns spread of companyInfo, not nested object
      expect(data.nameAr).toBe("شركة اختبار");
    });
  });
});
