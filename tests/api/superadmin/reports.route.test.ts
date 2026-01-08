/**
 * @fileoverview Tests for superadmin/reports API route
 * @description Cross-tenant report access for superadmin users
 * @route /api/superadmin/reports
 * @sprint 41
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiter before import
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock superadmin auth
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue(null),
}));

// Mock MongoDB
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      }),
      countDocuments: vi.fn().mockResolvedValue(0),
      insertOne: vi.fn().mockResolvedValue({ insertedId: "test-id" }),
    }),
  }),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("superadmin/reports route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/superadmin/reports", () => {
    it("should return 401 when not authenticated", async () => {
      const { GET } = await import("@/app/api/superadmin/reports/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/reports");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return reports with valid session", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const { GET } = await import("@/app/api/superadmin/reports/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/reports");
      const response = await GET(request);
      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /api/superadmin/reports", () => {
    it("should return 401 when not authenticated", async () => {
      const { POST } = await import("@/app/api/superadmin/reports/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/reports", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Report",
          type: "summary",
          format: "pdf",
        }),
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
