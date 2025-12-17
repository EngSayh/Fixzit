/**
 * @fileoverview Tests for /api/finance/invoices route
 * Tests invoice listing, creation, and filtering
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

// Mock rate limiter
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimit: vi.fn().mockReturnValue({ allowed: true }),
  rateLimitError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
    })
  ),
}));

// Mock rate limit middleware
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
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
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ insertedId: "inv-123" }),
      countDocuments: vi.fn().mockResolvedValue(0),
    }),
  }),
}));

import { GET, POST } from "@/app/api/finance/invoices/route";

describe("API /api/finance/invoices", () => {
  beforeEach(() => {
    sessionUser = null;
    vi.clearAllMocks();
  });

  describe("GET - List Invoices", () => {
    it("returns 401 when user is not authenticated", async () => {
      sessionUser = null;

      const req = new NextRequest("http://localhost:3000/api/finance/invoices");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 401 when session has no user", async () => {
      sessionUser = {} as SessionUser;

      const req = new NextRequest("http://localhost:3000/api/finance/invoices");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });
  });

  describe("POST - Create Invoice", () => {
    it("returns 401 when user is not authenticated", async () => {
      sessionUser = null;

      const req = new NextRequest("http://localhost:3000/api/finance/invoices", {
        method: "POST",
        body: JSON.stringify({
          customerId: "cust-123",
          items: [{ description: "Service", amount: 100 }],
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });
  });
});
