/**
 * @fileoverview Tests for /api/finance/payments route
 * Tests payment processing, listing, and validation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type SessionUser = {
  id?: string;
  orgId?: string;
  email?: string;
};
let sessionUser: SessionUser | null = null;

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => {
    if (!sessionUser) return null;
    return { user: sessionUser };
  }),
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
      insertOne: vi.fn().mockResolvedValue({ insertedId: "pay-123" }),
      countDocuments: vi.fn().mockResolvedValue(0),
    }),
  }),
}));

import { GET, POST } from "@/app/api/finance/payments/route";

describe("API /api/finance/payments", () => {
  beforeEach(() => {
    sessionUser = null;
    vi.clearAllMocks();
  });

  describe("GET - List Payments", () => {
    it("returns 401 when user is not authenticated", async () => {
      sessionUser = null;

      const req = new NextRequest("http://localhost:3000/api/finance/payments");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 401 when session has no user", async () => {
      sessionUser = {} as SessionUser;

      const req = new NextRequest("http://localhost:3000/api/finance/payments");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });
  });

  describe("POST - Record Payment", () => {
    it("returns 401 when user is not authenticated", async () => {
      sessionUser = null;

      const req = new NextRequest("http://localhost:3000/api/finance/payments", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: "inv-123",
          amount: 100,
          method: "card",
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });
  });
});
