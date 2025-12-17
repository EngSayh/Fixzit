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

// Mock Subscription model
vi.mock("@/server/models/Subscription", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

// Mock SubscriptionInvoice model
vi.mock("@/server/models/SubscriptionInvoice", () => ({
  SubscriptionInvoice: {
    aggregate: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

import { auth } from "@/auth";
import { GET } from "@/app/api/billing/history/route";

describe("API /api/billing/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth mock to return null by default
    vi.mocked(auth).mockResolvedValue(null);
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
        user: { id: "507f1f77bcf86cd799439011" }, // Valid ObjectId but no orgId
      } as never);

      const req = new NextRequest("http://localhost:3000/api/billing/history");
      const res = await GET(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toMatchObject({ error: "Organization context required" });
    });
  });

  describe("Pagination", () => {
    it("uses default pagination when no params provided", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { 
          id: "507f1f77bcf86cd799439011",  // Valid ObjectId
          orgId: "507f191e810c19729de860ea"  // Valid ObjectId
        },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/billing/history");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });
});
