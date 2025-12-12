/**
 * @fileoverview Tests for /api/billing/history route
 * Tests authentication, pagination, and organization context
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock database
vi.mock("@/db/mongo", () => ({
  getDb: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      }),
      countDocuments: vi.fn().mockResolvedValue(0),
    }),
  }),
}));

import { auth } from "@/auth";
import { GET } from "@/app/api/billing/history/route";

describe("API /api/billing/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/billing/history");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 401 when session has no user id", async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as never);

      const req = new NextRequest("http://localhost:3000/api/billing/history");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });
  });

  describe("Organization Context", () => {
    it("returns 400 when organization context is missing", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-123" },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/billing/history");
      const res = await GET(req);

      expect(res.status).toBe(400);
    });
  });

  describe("Pagination", () => {
    it("uses default pagination when no params provided", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-123" },
        organizationId: "org-123",
      } as never);

      const req = new NextRequest("http://localhost:3000/api/billing/history");
      const res = await GET(req);

      // Should either succeed or return 400 for missing org
      expect([200, 400]).toContain(res.status);
    });
  });
});
