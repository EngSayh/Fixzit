/**
 * @fileoverview Organization Settings API Tests
 * Tests for GET /api/organization/settings endpoint
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockConnectDb = vi.fn();
const mockGetSessionUser = vi.fn();
const mockEnforceRateLimit = vi.fn();
const mockOrgFindById = vi.fn();

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: () => mockConnectDb(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

vi.mock("@/server/models/Organization", () => ({
  Organization: {
    findById: (...args: unknown[]) => mockOrgFindById(...args),
  },
}));

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: (...args: unknown[]) => mockGetSessionUser(...args),
}));

describe("Organization Settings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock returns
    mockConnectDb.mockResolvedValue(undefined);
    mockEnforceRateLimit.mockReturnValue(null);
    mockGetSessionUser.mockResolvedValue({
      id: "user-123",
      orgId: "org-123",
      role: "admin",
    });
    mockOrgFindById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          name: "Test Org",
          logo: "/img/test-logo.png",
          branding: {
            primaryColor: "#123456",
            secondaryColor: "#654321",
            accentColor: "#ABCDEF",
          },
        }),
      }),
    });
  });

  describe("GET /api/organization/settings", () => {
    it("should return organization branding for authenticated user", async () => {
      const { GET } = await import("@/app/api/organization/settings/route");
      const req = new NextRequest("http://localhost/api/organization/settings");

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Test Org");
      expect(data.logo).toBe("/img/test-logo.png");
      expect(data.primaryColor).toBe("#123456");
      expect(data.secondaryColor).toBe("#654321");
      expect(data.accentColor).toBe("#ABCDEF");
    });

    it("should return default branding for unauthenticated user", async () => {
      mockGetSessionUser.mockRejectedValueOnce(new Error("Unauthorized"));

      const { GET } = await import("@/app/api/organization/settings/route");
      const req = new NextRequest("http://localhost/api/organization/settings");

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("FIXZIT ENTERPRISE");
      expect(data.logo).toBe("/img/fixzit-logo.png");
      expect(data.primaryColor).toBe("#0061A8");
    });

    it("should return default branding when org not found", async () => {
      vi.resetModules();
      mockOrgFindById.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      });

      const { GET } = await import("@/app/api/organization/settings/route");
      const req = new NextRequest("http://localhost/api/organization/settings");

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("FIXZIT ENTERPRISE");
    });

    it("should set Cache-Control and ETag headers", async () => {
      const { GET } = await import("@/app/api/organization/settings/route");
      const req = new NextRequest("http://localhost/api/organization/settings");

      const response = await GET(req);

      expect(response.headers.get("Cache-Control")).toContain("max-age=300");
      expect(response.headers.get("ETag")).toBeTruthy();
    });

    it("should return 500 on database error", async () => {
      mockConnectDb.mockRejectedValueOnce(new Error("DB connection failed"));

      vi.resetModules();
      const { GET } = await import("@/app/api/organization/settings/route");
      const req = new NextRequest("http://localhost/api/organization/settings");

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to load organization settings");
    });
  });
});
