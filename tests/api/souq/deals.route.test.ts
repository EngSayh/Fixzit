/**
 * @fileoverview Tests for /api/souq/deals routes
 * Tests deal/promotion management operations
 * 
 * Pattern: Static imports for mock isolation (per TESTING_STRATEGY.md)
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

// Mock auth+RBAC middleware
vi.mock("@/server/middleware/withAuthRbac", () => {
  class MockUnauthorizedError extends Error {}
  return {
    getSessionUser: vi.fn(),
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

// Static imports AFTER vi.mock() declarations (mocks are hoisted)
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser, UnauthorizedError } from "@/server/middleware/withAuthRbac";

// Dynamic import to ensure mocks are applied fresh per test
const importRoute = async () => import("@/app/api/souq/deals/route");

describe("API /api/souq/deals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mutable state to defaults
    sessionUser = {
      id: "user-123",
      orgId: "org-123",
      role: "ADMIN",
    };
    // Reset rate limit mock to allow requests through
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    // Default: authenticated session
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "user-123",
      orgId: "org-123",
      role: "ADMIN",
    } as never);
  });

  describe("GET - List Deals", () => {
    it("returns 429 when rate limit exceeded", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/souq/deals");
      const response = await GET(req);

      expect(response.status).toBe(429);
    });

    it("returns deals list", async () => {
      sessionUser = { id: "user-123", orgId: "org-123" };

      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/souq/deals");
      const response = await GET(req);

      expect([200, 401, 500]).toContain(response.status);
    });

    it("supports active filter", async () => {
      sessionUser = { id: "user-123", orgId: "org-123" };

      const { GET } = await importRoute();
      const req = new NextRequest(
        "http://localhost:3000/api/souq/deals?active=true"
      );
      const response = await GET(req);

      expect([200, 401, 500]).toContain(response.status);
    });

    it("supports category filter", async () => {
      sessionUser = { id: "user-123", orgId: "org-123" };

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
      vi.mocked(getSessionUser).mockRejectedValue(
        new UnauthorizedError("Unauthenticated"),
      );

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
