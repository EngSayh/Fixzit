/**
 * @fileoverview Tests for /api/settings/logo route
 * Tests logo retrieval and fallback behavior
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock session
let mockSession: { orgId?: string; id?: string } | null = null;
vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: vi.fn(async () => ({
    ok: true,
    session: mockSession,
  })),
}));

// Mock PlatformSettings model
let mockSettings: { logoUrl?: string; brandName?: string; brandColor?: string } | null = null;
vi.mock("@/server/models/PlatformSettings", () => ({
  PlatformSettings: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockReturnValue({
        exec: vi.fn(async () => mockSettings),
      }),
    }),
  },
}));

// Mock brand colors
vi.mock("@/lib/config/brand-colors", () => ({
  BRAND_COLORS: {
    primary: "#0061A8",
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { GET } from "@/app/api/settings/logo/route";

describe("API /api/settings/logo", () => {
  beforeEach(() => {
    mockSession = null;
    mockSettings = null;
    vi.clearAllMocks();
  });

  describe("GET /api/settings/logo", () => {
    it("returns default values when no settings exist", async () => {
      mockSettings = null;

      const req = new NextRequest("http://localhost:3000/api/settings/logo", {
        method: "GET",
      });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.logoUrl).toBeNull();
      expect(data.brandName).toBe("Fixzit Enterprise");
      expect(data.brandColor).toBe("#0061A8");
    });

    it("returns stored settings when available", async () => {
      mockSession = { orgId: "org-123", id: "user-123" };
      mockSettings = {
        logoUrl: "https://example.com/logo.png",
        brandName: "Custom Brand",
        brandColor: "#FF0000",
      };

      const req = new NextRequest("http://localhost:3000/api/settings/logo", {
        method: "GET",
      });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.logoUrl).toBe("https://example.com/logo.png");
      expect(data.brandName).toBe("Custom Brand");
      expect(data.brandColor).toBe("#FF0000");
    });

    it("works for unauthenticated requests with defaults", async () => {
      mockSession = null;
      mockSettings = null;

      const req = new NextRequest("http://localhost:3000/api/settings/logo", {
        method: "GET",
      });
      const res = await GET(req);

      // Public endpoint should work without auth
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("brandName");
    });

    it("returns defaults when settings exist but logoUrl is empty", async () => {
      mockSession = { orgId: "org-123", id: "user-123" };
      mockSettings = {
        logoUrl: "",
        brandName: "Custom Name",
      };

      const req = new NextRequest("http://localhost:3000/api/settings/logo", {
        method: "GET",
      });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      // Empty logoUrl should return defaults
      expect(data.logoUrl).toBeFalsy();
    });
  });
});
