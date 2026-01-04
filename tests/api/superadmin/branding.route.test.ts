/**
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

vi.mock("@/server/models/PlatformSettings", () => ({
  PlatformSettings: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the SSRF validator to allow all URLs in tests
vi.mock("@/lib/security/validate-public-https-url", () => ({
  validatePublicHttpsUrl: vi.fn().mockResolvedValue(new URL("https://example.com")),
  isValidPublicHttpsUrl: vi.fn().mockResolvedValue(true),
  URLValidationError: class URLValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "URLValidationError";
    }
  },
}));

// Dynamic imports AFTER mocks are set up
const { GET, PATCH } = await import("@/app/api/superadmin/branding/route");
const { PlatformSettings } = await import("@/server/models/PlatformSettings");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
const { validatePublicHttpsUrl } = await import("@/lib/security/validate-public-https-url");

describe("Superadmin Branding API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");

    // Reset rate limit mock to allow requests (returns null = no rate limit)
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
    } as any);
    vi.mocked(validatePublicHttpsUrl).mockResolvedValue(
      new URL("https://example.com"),
    );
  });

  describe("GET /api/superadmin/branding", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/branding");
      const response = await GET(request);

      expectAuthFailure(response);
      const data = await response.json();
      expect(data.error).toContain("Unauthorized");
    });

    it("should return existing platform settings", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);

      const mockSettings = {
        logoUrl: "/img/custom-logo.png",
        brandName: "Custom Brand",
        brandColor: "#FF5733",
        logoStorageKey: "logos/custom.png",
        logoFileName: "custom.png",
        logoMimeType: "image/png",
        logoFileSize: 12345,
        faviconUrl: "/favicon-custom.ico",
        updatedAt: new Date("2025-01-01"),
        updatedBy: "admin",
      };

      // Route uses findOneAndUpdate with upsert (not findOne + create)
      vi.mocked(PlatformSettings.findOneAndUpdate).mockResolvedValue(mockSettings as any);

      const request = new NextRequest("http://localhost/api/superadmin/branding");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.logoUrl).toBe("/img/custom-logo.png");
      expect(data.data.brandName).toBe("Custom Brand");
      expect(data.data.brandColor).toBe("#FF5733");
    });

    it("should create default settings if none exist", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);

      // Route uses findOneAndUpdate with upsert + $setOnInsert for defaults
      const mockCreatedSettings = {
        logoUrl: "/img/fixzit-logo.png",
        brandName: "Fixzit Enterprise",
        brandColor: "#0061A8",
        updatedBy: "superadmin",
        createdBy: "superadmin",
      };

      vi.mocked(PlatformSettings.findOneAndUpdate).mockResolvedValue(mockCreatedSettings as any);

      const request = new NextRequest("http://localhost/api/superadmin/branding");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(PlatformSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { orgId: { $exists: false } },
        expect.objectContaining({
          $setOnInsert: expect.objectContaining({
            logoUrl: "/img/fixzit-logo.png",
            brandName: "Fixzit Enterprise",
          }),
        }),
        expect.objectContaining({
          new: true,
          upsert: true,
        })
      );
    });
  });

  describe("PATCH /api/superadmin/branding", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/branding", {
        method: "PATCH",
        body: JSON.stringify({ brandName: "New Name" }),
      });

      const response = await PATCH(request);

      expectAuthFailure(response);
      const data = await response.json();
      expect(data.error).toContain("Unauthorized");
    });

    it("should return 400 for invalid hex color", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandColor: "invalid-color", // Invalid hex
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("hex color");
    });

    it("should update platform settings successfully with HTTPS logo URL", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);

      const mockUpdatedSettings = {
        logoUrl: "https://cdn.example.com/new-logo.png",
        brandName: "Updated Brand",
        brandColor: "#00A859",
        updatedBy: "superadmin",
        updatedAt: new Date(),
      };

      vi.mocked(PlatformSettings.findOneAndUpdate).mockResolvedValue(
        mockUpdatedSettings as any
      );

      const payload = {
        logoUrl: "https://cdn.example.com/new-logo.png",
        brandName: "Updated Brand",
        brandColor: "#00A859",
      };

      const request = new NextRequest("http://localhost/api/superadmin/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.logoUrl).toBe("https://cdn.example.com/new-logo.png");
      expect(data.data.brandName).toBe("Updated Brand");
    });
  });

  describe("SSRF Protection", () => {
    beforeEach(() => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);
    });

    it("should reject HTTP URLs (only HTTPS allowed)", async () => {
      // Mock validator to throw HTTPS error
      vi.mocked(validatePublicHttpsUrl).mockRejectedValueOnce(
        new Error("Only HTTPS URLs are allowed")
      );

      const request = new NextRequest("http://localhost/api/superadmin/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: "http://example.com/logo.png" }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Only HTTPS URLs are allowed");
    });

    it("should reject localhost URLs", async () => {
      vi.mocked(validatePublicHttpsUrl).mockRejectedValueOnce(
        new Error("Localhost/loopback URLs are not allowed")
      );

      const request = new NextRequest("http://localhost/api/superadmin/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: "https://localhost/logo.png" }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Localhost/loopback URLs are not allowed");
    });

    it("should reject private IP addresses (192.168.x.x)", async () => {
      vi.mocked(validatePublicHttpsUrl).mockRejectedValueOnce(
        new Error("Private IP address URLs are not allowed")
      );

      const request = new NextRequest("http://localhost/api/superadmin/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: "https://192.168.1.1/logo.png" }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Private IP address URLs are not allowed");
    });

    it("should reject AWS metadata endpoint (169.254.169.254)", async () => {
      vi.mocked(validatePublicHttpsUrl).mockRejectedValueOnce(
        new Error("Private IP address URLs are not allowed")
      );

      const request = new NextRequest("http://localhost/api/superadmin/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: "https://169.254.169.254/latest/meta-data/" }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Private IP address URLs are not allowed");
    });

    it("should reject internal domains (.local/.internal)", async () => {
      vi.mocked(validatePublicHttpsUrl).mockRejectedValueOnce(
        new Error("Internal TLD (.local, .internal, .test) URLs are not allowed")
      );

      const request = new NextRequest("http://localhost/api/superadmin/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: "https://database.internal/logo.png" }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain(
        "Internal TLD (.local, .internal, .test) URLs are not allowed",
      );
    });

    it("should accept valid public HTTPS URLs", async () => {
      // Reset mock to allow this URL
      vi.mocked(validatePublicHttpsUrl).mockResolvedValueOnce(
        new URL("https://cdn.example.com/logo.png")
      );
      vi.mocked(PlatformSettings.findOneAndUpdate).mockResolvedValue({
        logoUrl: "https://cdn.example.com/logo.png",
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: "https://cdn.example.com/logo.png" }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
