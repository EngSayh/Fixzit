/**
 * @fileoverview Tests for /api/qa/health route
 * Tests SUPER_ADMIN authorization and health check response
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Deterministic rate limit mock
let rateLimitAllowed = true;
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(async () => ({ allowed: rateLimitAllowed })),
  buildOrgAwareRateLimitKey: vi.fn(() => "test-rate-key"),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(
    () =>
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
      })
  ),
}));

// Mock requireSuperAdmin
let isSuperAdmin = false;
vi.mock("@/lib/authz", () => ({
  requireSuperAdmin: vi.fn(async () => {
    if (!isSuperAdmin) {
      // Route catches errors that are Response instances
      throw new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }
    // Return auth context with required fields when super admin
    return { id: "admin-123", tenantId: "org-123" };
  }),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { GET } from "@/app/api/qa/health/route";

describe("API /api/qa/health", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    rateLimitAllowed = true;
    isSuperAdmin = false;
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    // Set up database mock for health check
    (globalThis as Record<string, unknown>).__connectToDatabaseMock = async () => ({
      connection: { 
        db: { 
          listCollections: () => ({ 
            toArray: async () => [{ name: "test_collection" }] 
          }) 
        } 
      },
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    delete (globalThis as Record<string, unknown>).__connectToDatabaseMock;
  });

  describe("Playwright Test Mode", () => {
    it("returns mock health data when PLAYWRIGHT_TESTS is true", async () => {
      process.env.PLAYWRIGHT_TESTS = "true";

      const req = new NextRequest("http://localhost:3000/api/qa/health", {
        method: "GET",
      });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("healthy");
      expect(data.mockDatabase).toBe(true);
    });
  });

  describe("Rate Limiting", () => {
    it("returns 429 when rate limited", async () => {
      rateLimitAllowed = false;
      isSuperAdmin = true; // Must be super admin first, then rate limit kicks in

      const req = new NextRequest("http://localhost:3000/api/qa/health", {
        method: "GET",
      });
      const res = await GET(req);

      // Rate limiting applies after auth check
      expect(res.status).toBe(429);
    });
  });

  describe("Authorization", () => {
    it("returns 403 for non-SUPER_ADMIN users", async () => {
      isSuperAdmin = false;
      delete process.env.PLAYWRIGHT_TESTS;

      const req = new NextRequest("http://localhost:3000/api/qa/health", {
        method: "GET",
      });
      const res = await GET(req);

      expect(res.status).toBe(403);
    });
  });

  describe("Success Cases", () => {
    it("returns health status for SUPER_ADMIN", async () => {
      isSuperAdmin = true;
      delete process.env.PLAYWRIGHT_TESTS;

      const req = new NextRequest("http://localhost:3000/api/qa/health", {
        method: "GET",
      });
      const res = await GET(req);

      // With proper mocks in place, expect 200 success
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBeDefined();
      expect(data.database).toBeDefined();
    });
  });
});
