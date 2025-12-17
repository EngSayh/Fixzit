/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, PATCH } from "@/app/api/superadmin/branding/route";
import { NextRequest } from "next/server";
import { PlatformSettings } from "@/server/models/PlatformSettings";

// Mock dependencies
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

const { getSuperadminSession } = await import("@/lib/superadmin/auth");

describe("Superadmin Branding API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/superadmin/branding", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/branding");
      const response = await GET(request);

      expect(response.status).toBe(401);
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

      vi.mocked(PlatformSettings.findOne).mockResolvedValue(mockSettings as any);

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

      vi.mocked(PlatformSettings.findOne).mockResolvedValue(null);

      const mockCreatedSettings = {
        logoUrl: "/img/fixzit-logo.png",
        brandName: "Fixzit Enterprise",
        brandColor: "#0061A8",
        updatedBy: "superadmin",
        createdBy: "superadmin",
      };

      vi.mocked(PlatformSettings.create).mockResolvedValue(mockCreatedSettings as any);

      const request = new NextRequest("http://localhost/api/superadmin/branding");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(PlatformSettings.create).toHaveBeenCalledWith(
        expect.objectContaining({
          logoUrl: "/img/fixzit-logo.png",
          brandName: "Fixzit Enterprise",
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

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain("Unauthorized");
    });

    it("should return 400 for invalid payload", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/branding", {
        method: "PATCH",
        body: JSON.stringify({
          brandColor: "invalid-color", // Invalid hex
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid payload");
    });

    it("should update platform settings successfully", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);

      const mockUpdatedSettings = {
        logoUrl: "/img/new-logo.png",
        brandName: "Updated Brand",
        brandColor: "#00A859",
        updatedBy: "superadmin",
        updatedAt: new Date(),
      };

      vi.mocked(PlatformSettings.findOneAndUpdate).mockResolvedValue(
        mockUpdatedSettings as any
      );

      const request = new NextRequest("http://localhost/api/superadmin/branding", {
        method: "PATCH",
        body: JSON.stringify({
          logoUrl: "/img/new-logo.png",
          brandName: "Updated Brand",
          brandColor: "#00A859",
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.logoUrl).toBe("/img/new-logo.png");
      expect(data.data.brandName).toBe("Updated Brand");
      expect(data.message).toContain("updated successfully");
    });

    it("should enforce logo file size limit (2MB)", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/branding", {
        method: "PATCH",
        body: JSON.stringify({
          logoUrl: "/img/huge-logo.png",
          logoFileSize: 3_000_000, // 3MB - exceeds limit
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid payload");
    });

    it("should allow targeting specific orgId", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);

      const mockSettings = {
        logoUrl: "/img/org-logo.png",
        brandName: "Org Brand",
        brandColor: "#0061A8",
      };

      vi.mocked(PlatformSettings.findOneAndUpdate).mockResolvedValue(mockSettings as any);

      const request = new NextRequest("http://localhost/api/superadmin/branding", {
        method: "PATCH",
        body: JSON.stringify({
          orgId: "org_123",
          logoUrl: "/img/org-logo.png",
          brandName: "Org Brand",
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(PlatformSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { orgId: "org_123" },
        expect.any(Object),
        expect.any(Object)
      );
    });
  });
});
