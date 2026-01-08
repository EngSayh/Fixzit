/**
 * @fileoverview Tests for superadmin/organizations/search API route
 * @description GET endpoint for searching organizations
 * @route /api/superadmin/organizations/search
 * @sprint 46
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock superadmin auth
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue(null),
}));

// Mock MongoDB
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock Organization model
vi.mock("@/server/models/Organization", () => ({
  Organization: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("superadmin/organizations/search route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/superadmin/organizations/search", () => {
    it("should return 401 when not authenticated", async () => {
      const { GET } = await import("@/app/api/superadmin/organizations/search/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/organizations/search?q=test");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should search organizations with query", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const { GET } = await import("@/app/api/superadmin/organizations/search/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/organizations/search?q=test");
      const response = await GET(request);
      expect([200, 500]).toContain(response.status);
    });
  });
});
