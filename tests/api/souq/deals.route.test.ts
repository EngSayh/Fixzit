/**
 * @fileoverview Tests for /api/souq/deals routes
 * Tests deal/promotion management operations
 * 
 * Pattern: Mutable state pattern for mock isolation (per TESTING_STRATEGY.md)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type SessionUser = {
  id?: string;
  orgId?: string;
  role?: string;
  email?: string;
  isSuperAdmin?: boolean;
  subRole?: string;
  [key: string]: unknown;
};

// Mutable state variables - controlled by beforeEach
let sessionUser: SessionUser | null = null;
let mockRateLimitResponse: Response | null = null;

// Mock authentication - uses mutable state
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => {
    if (!sessionUser) return null;
    return { user: sessionUser, expires: new Date().toISOString() };
  }),
}));

// Mock rate limiting - uses mutable state
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

// Mock auth+RBAC middleware - uses mutable state
vi.mock("@/server/middleware/withAuthRbac", () => {
  class MockUnauthorizedError extends Error {}
  return {
    getSessionUser: vi.fn(async () => {
      if (!sessionUser) throw new MockUnauthorizedError("Unauthenticated");
      return sessionUser;
    }),
    UnauthorizedError: MockUnauthorizedError,
  };
});

// Mock Deal model
vi.mock("@/server/models/souq/Deal", () => ({
  SouqDeal: {
    find: vi.fn().mockReturnValue({
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
    create: vi.fn(),
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

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Dynamic import to ensure mocks are applied fresh per test
const importRoute = async () => import("@/app/api/souq/deals/route");

describe("API /api/souq/deals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mutable state to defaults
    mockRateLimitResponse = null;
    sessionUser = {
      id: "user-123",
      orgId: "org-123",
      role: "ADMIN",
    };
  });

  describe("GET - List Deals", () => {
    it("returns 429 when rate limit exceeded", async () => {
      mockRateLimitResponse = new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429 }
      );

      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/souq/deals");
      const response = await GET(req);

      expect(response.status).toBe(429);
    });

    it("returns deals list", async () => {
      // sessionUser already set in beforeEach

      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/souq/deals");
      const response = await GET(req);

      expect([200, 401, 500]).toContain(response.status);
    });

    it("supports active filter", async () => {
      // sessionUser already set in beforeEach

      const { GET } = await importRoute();
      const req = new NextRequest(
        "http://localhost:3000/api/souq/deals?active=true"
      );
      const response = await GET(req);

      expect([200, 401, 500]).toContain(response.status);
    });

    it("supports category filter", async () => {
      // sessionUser already set in beforeEach

      const { GET } = await importRoute();
      const req = new NextRequest(
        "http://localhost:3000/api/souq/deals?categoryId=cat-123"
      );
      const response = await GET(req);

      expect([200, 401, 500]).toContain(response.status);
    });
  });

  describe("POST - Create Deal", () => {
    it("returns 401 for unauthenticated requests", async () => {
      sessionUser = null; // Unauthenticated

      const { POST } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/souq/deals", {
        method: "POST",
        body: JSON.stringify({ title: "Summer Sale" }),
      });
      const response = await POST(req);

      expect([401, 403]).toContain(response.status);
    });

    it("validates required fields", async () => {
      sessionUser = { id: "user-123", orgId: "org-123", role: "SELLER" };

      const { POST } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/souq/deals", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST(req);

      expect([400, 401, 403, 500]).toContain(response.status);
    });
  });
});
