/**
 * @fileoverview Tests for /api/finance/payments route
 * Tests payment processing, listing, and validation
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
      insertOne: vi.fn().mockResolvedValue({ insertedId: "pay-123" }),
      countDocuments: vi.fn().mockResolvedValue(0),
    }),
  }),
}));

import { auth } from "@/auth";
import { GET, POST } from "@/app/api/finance/payments/route";

describe("API /api/finance/payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET - List Payments", () => {
    it("returns 401 when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/finance/payments");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 401 when session has no user", async () => {
      vi.mocked(auth).mockResolvedValue({ user: null } as never);

      const req = new NextRequest("http://localhost:3000/api/finance/payments");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });
  });

  describe("POST - Record Payment", () => {
    it("returns 401 when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

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
