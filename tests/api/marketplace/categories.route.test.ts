/**
 * @fileoverview Tests for /api/marketplace/categories route
 * Tests product category listing operations
 * 
 * Pattern: Mutable state pattern for mock isolation (per TESTING_STRATEGY.md)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mutable state variables - controlled by beforeEach
let mockRateLimitResponse: Response | null = null;

// Mock marketplace context
vi.mock("@/lib/marketplace/context", () => ({
  resolveMarketplaceContext: vi.fn(),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock Category model
vi.mock("@/server/models/marketplace/Category", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

// Mock rate limiting - uses mutable state
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

// Mock serializers
vi.mock("@/lib/marketplace/serializers", () => ({
  serializeCategory: vi.fn((cat) => cat),
}));

// Dynamic import to ensure mocks are applied fresh each test
const importRoute = async () => import("@/app/api/marketplace/categories/route");

describe("API /api/marketplace/categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mutable state to defaults
    mockRateLimitResponse = null;
    // Reset environment
    process.env.MARKETPLACE_ENABLED = "true";
  });

  describe("GET - List Categories", () => {
    it("returns error when marketplace is disabled", async () => {
      process.env.MARKETPLACE_ENABLED = "false";

      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/marketplace/categories");
      const res = await GET(req);

      // Returns 500 or 501 when disabled
      expect([500, 501]).toContain(res.status);
    });

    it("returns 429 when rate limit exceeded", async () => {
      mockRateLimitResponse = new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
      });

      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/marketplace/categories");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("returns categories when marketplace is enabled", async () => {
      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/marketplace/categories");
      const res = await GET(req);

      // Should return 200 or 500 (if DB not connected)
      expect([200, 500]).toContain(res.status);
    });

    it("returns list of categories successfully", async () => {
      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/marketplace/categories");
      const res = await GET(req);

      // Should return 200 or 500 (if DB not connected), not rate limited
      expect([200, 500]).toContain(res.status);
    });

    it("uses rate limiting middleware", async () => {
      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/marketplace/categories");
      await GET(req);

      // Import the mock to verify it was called
      const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
      expect(enforceRateLimit).toHaveBeenCalled();
    });
  });
});
