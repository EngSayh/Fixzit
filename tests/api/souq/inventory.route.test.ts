/**
 * @fileoverview Tests for /api/souq/inventory routes
 * Tests inventory management operations including listing, adjustments, and reservations
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
    return { user: sessionUser, expires: new Date().toISOString() };
  }),
}));

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock inventory service
vi.mock("@/services/souq/inventory-service", () => ({
  inventoryService: {
    getInventory: vi.fn(),
    adjustStock: vi.fn(),
    reserveStock: vi.fn(),
    releaseReservation: vi.fn(),
  },
}));

// Mock SouqListing model
vi.mock("@/server/models/souq/Listing", () => ({
  SouqListing: {
    find: vi.fn().mockReturnValue({
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
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
import { GET } from "@/app/api/souq/inventory/route";

describe("API /api/souq/inventory", () => {
  beforeEach(() => {
    sessionUser = null;
    vi.clearAllMocks();
    // Reset rate limit mock to allow requests through
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    // Reset default sessionUser for auth tests
    sessionUser = {
      id: "test-user-id",
      orgId: "test-org-id",
      role: "VENDOR",
    };
  });

  describe("GET - List Inventory", () => {
    it("returns 429 when rate limit exceeded", async () => {
      vi.mocked(enforceRateLimit).mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/souq/inventory");
      const response = await GET(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      sessionUser = null;

      const req = new NextRequest("http://localhost:3000/api/souq/inventory");
      const response = await GET(req);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 403 when organization context is missing", async () => {
      sessionUser = { id: "user-123" };

      const req = new NextRequest("http://localhost:3000/api/souq/inventory");
      const response = await GET(req);

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toBe("Organization context required");
    });

    it("returns inventory list for authenticated seller", async () => {
      sessionUser = { id: "user-123", orgId: "org-123" };

      const req = new NextRequest("http://localhost:3000/api/souq/inventory");
      const response = await GET(req);

      expect(response.status).toBe(200);
    });

    it("supports pagination parameters", async () => {
      sessionUser = { id: "user-123", orgId: "org-123" };

      const req = new NextRequest(
        "http://localhost:3000/api/souq/inventory?page=2&limit=20"
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
    });

    it("supports status filter", async () => {
      sessionUser = { id: "user-123", orgId: "org-123" };

      const req = new NextRequest(
        "http://localhost:3000/api/souq/inventory?status=IN_STOCK"
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
    });

    it("supports lowStockOnly filter", async () => {
      sessionUser = { id: "user-123", orgId: "org-123" };

      const req = new NextRequest(
        "http://localhost:3000/api/souq/inventory?lowStockOnly=true"
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
    });
  });
});
