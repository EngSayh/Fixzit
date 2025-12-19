/**
 * @fileoverview Tests for /api/souq/orders route
 * Tests order operations including auth, validation, and rate limiting
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type SessionUser = {
  id?: string;
  orgId?: string;
  role?: string;
};
let sessionUser: SessionUser | null = null;

// Mock authentication
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => {
    if (!sessionUser) return null;
    return { user: sessionUser };
  }),
}));

// Mock database connection - all variants
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/lib/db", () => ({
  ensureMongoConnection: vi.fn(),
}));

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock Order model
vi.mock("@/server/models/souq/Order", () => ({
  SouqOrder: {
    find: vi.fn().mockReturnValue({
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
    create: vi.fn(),
  },
}));

// Mock Listing model
vi.mock("@/server/models/souq/Listing", () => ({
  SouqListing: {
    findById: vi.fn(),
  },
}));

// Mock EscrowAccount model
vi.mock("@/server/models/finance/EscrowAccount", () => ({
  EscrowAccount: {},
  EscrowSource: {},
}));

// Mock escrow service
vi.mock("@/services/souq/settlements/escrow-service", () => ({
  escrowService: {
    holdFunds: vi.fn().mockResolvedValue({ success: true }),
    releaseFunds: vi.fn().mockResolvedValue({ success: true }),
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

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { GET, POST } from "@/app/api/souq/orders/route";

describe("API /api/souq/orders", () => {
  beforeEach(() => {
    sessionUser = null;
    vi.clearAllMocks();
  });

  it("returns 429 with Retry-After when rate limited (GET)", async () => {
    vi.mocked(enforceRateLimit).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Retry-After": "60" },
      }) as never,
    );
    const req = new NextRequest("http://localhost:3000/api/souq/orders");
    const res = await GET(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeDefined();
  });

  describe("GET - List Orders", () => {
    it("returns 401 when user is not authenticated", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      sessionUser = null;

      const req = new NextRequest("http://localhost:3000/api/souq/orders");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limit exceeded", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/souq/orders");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("returns 403 when orgId is missing", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      sessionUser = { id: "user-123" };

      const req = new NextRequest("http://localhost:3000/api/souq/orders");
      const res = await GET(req);

      expect(res.status).toBe(403);
    });

    it("returns orders for authenticated user with orgId", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      sessionUser = {
        id: "user-123",
        orgId: "507f1f77bcf86cd799439011",
        role: "ADMIN",
      };

      const req = new NextRequest("http://localhost:3000/api/souq/orders");
      const res = await GET(req);

      // Should return 200 or handle gracefully
      expect(res.status).toBe(200);
    });

    it("supports status filter", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      sessionUser = {
        id: "user-123",
        orgId: "507f1f77bcf86cd799439011",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/souq/orders?status=PENDING"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("supports customerId filter", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      sessionUser = {
        id: "user-123",
        orgId: "507f1f77bcf86cd799439011",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/souq/orders?customerId=507f1f77bcf86cd799439011"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("supports pagination parameters", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      sessionUser = {
        id: "user-123",
        orgId: "507f1f77bcf86cd799439011",
      };

      const req = new NextRequest(
        "http://localhost:3000/api/souq/orders?page=2&limit=10"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });

  describe("POST - Create Order", () => {
    it("returns 401 when user is not authenticated", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      // sessionUser is null by default

      const req = new NextRequest("http://localhost:3000/api/souq/orders", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limit exceeded", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/souq/orders", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);

      expect(res.status).toBe(429);
    });

    it("validates required fields with Zod", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      sessionUser = {
        id: "user-123",
        orgId: "507f1f77bcf86cd799439011",
      };

      const req = new NextRequest("http://localhost:3000/api/souq/orders", {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields
          customerId: "507f1f77bcf86cd799439011",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("validates items array is not empty", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      sessionUser = {
        id: "user-123",
        orgId: "507f1f77bcf86cd799439011",
      };

      const req = new NextRequest("http://localhost:3000/api/souq/orders", {
        method: "POST",
        body: JSON.stringify({
          customerId: "507f1f77bcf86cd799439011",
          customerEmail: "test@example.com",
          customerPhone: "1234567890",
          items: [], // Empty array should fail
          shippingAddress: {
            name: "Test User",
            phone: "1234567890",
            addressLine1: "123 Test St",
            city: "Test City",
            state: "Test State",
            country: "OM",
            postalCode: "12345",
          },
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("validates email format", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      sessionUser = {
        id: "user-123",
        orgId: "507f1f77bcf86cd799439011",
      };

      const req = new NextRequest("http://localhost:3000/api/souq/orders", {
        method: "POST",
        body: JSON.stringify({
          customerId: "507f1f77bcf86cd799439011",
          customerEmail: "invalid-email", // Invalid email
          customerPhone: "1234567890",
          items: [
            {
              listingId: "507f1f77bcf86cd799439011",
              quantity: 1,
            },
          ],
          shippingAddress: {
            name: "Test User",
            phone: "1234567890",
            addressLine1: "123 Test St",
            city: "Test City",
            state: "Test State",
            country: "OM",
            postalCode: "12345",
          },
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });
});
