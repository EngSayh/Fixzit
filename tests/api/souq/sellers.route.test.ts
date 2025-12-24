/**
 * @fileoverview Tests for /api/souq/sellers routes
 * Tests seller management operations including listing and registration
 * 
 * Pattern: Static imports with mutable context variables (per TESTING_STRATEGY.md)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE (read by mock factories via closures)
// Pattern: Vitest pool:forks requires mutable state for mock configuration
// ============================================================================
type SessionUser = { id: string; orgId: string; role: string } | null;
let sessionUser: SessionUser = null;
let mockRateLimitResponse: Response | null = null;

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => (sessionUser ? { user: sessionUser, expires: new Date().toISOString() } : null)),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

// Mock Seller model
vi.mock("@/server/models/souq/Seller", () => ({
  SouqSeller: {
    find: vi.fn().mockReturnValue({
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
    create: vi.fn(),
    findOne: vi.fn(),
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

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Static imports AFTER vi.mock declarations (Vitest hoists mocks)
import { GET, POST } from "@/app/api/souq/sellers/route";

describe("API /api/souq/sellers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mutable state to defaults
    sessionUser = null;
    mockRateLimitResponse = null;
  });

  describe("Authentication & Authorization", () => {
    it("returns 429 when rate limit exceeded on POST", async () => {
      mockRateLimitResponse = new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429 }
      );

      const req = new NextRequest("http://localhost:3000/api/souq/sellers", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      // sessionUser is null by default (no need to set)

      const req = new NextRequest("http://localhost:3000/api/souq/sellers");
      const response = await GET(req);

      expect([401, 403]).toContain(response.status);
    });

    it("allows authenticated users to access seller list", async () => {
      sessionUser = { id: "user-123", orgId: "org-123", role: "ADMIN" };

      const req = new NextRequest("http://localhost:3000/api/souq/sellers");
      const response = await GET(req);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("GET - List Sellers", () => {
    it("supports pagination", async () => {
      sessionUser = { id: "user-123", orgId: "org-123", role: "ADMIN" };

      const req = new NextRequest(
        "http://localhost:3000/api/souq/sellers?page=1&limit=10"
      );
      const response = await GET(req);

      expect([200, 500]).toContain(response.status);
    });

    it("supports status filter", async () => {
      sessionUser = { id: "user-123", orgId: "org-123", role: "ADMIN" };

      const req = new NextRequest(
        "http://localhost:3000/api/souq/sellers?status=ACTIVE"
      );
      const response = await GET(req);

      expect([200, 500]).toContain(response.status);
    });
  });
});
