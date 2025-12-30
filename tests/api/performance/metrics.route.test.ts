/**
 * @fileoverview Tests for /api/performance/metrics route
 * Tests authentication, SUPER_ADMIN authorization, and metrics retrieval
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  setMockUser,
  clearMockUser,
  mockSessionUser,
} from "@/tests/helpers/mockAuth";

// Use vi.hoisted to create mock functions that can be accessed in the test
const { mockGetRecentMetrics } = vi.hoisted(() => ({
  mockGetRecentMetrics: vi.fn().mockReturnValue([
    { timestamp: Date.now(), latency: 45, path: "/api/test" },
  ]),
}));

// Mock session via getSessionUser
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(async () => {
    if (!mockSessionUser) {
      const error = new Error("Authentication required");
      (error as Error & { name: string }).name = "UnauthorizedError";
      throw error;
    }
    return mockSessionUser;
  }),
}));

vi.mock("@/server/utils/isUnauthorizedError", () => ({
  isUnauthorizedError: vi.fn((error) => {
    return error?.name === "UnauthorizedError" || 
           error?.message?.includes("Unauthorized") ||
           error?.message?.includes("Authentication");
  }),
}));

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock performance functions using hoisted mock for getRecentMetrics
vi.mock("@/lib/performance", () => ({
  getPerformanceStats: vi.fn().mockReturnValue({
    totalRequests: 1000,
    averageLatency: 50,
    p95Latency: 150,
    errorRate: 0.01,
  }),
  getRecentMetrics: mockGetRecentMetrics,
  getExceededMetrics: vi.fn().mockReturnValue([]),
}));

import { GET } from "@/app/api/performance/metrics/route";

describe("API /api/performance/metrics", () => {
  beforeEach(() => {
    clearMockUser();
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      setMockUser(null);

      const req = new NextRequest(
        "http://localhost:3000/api/performance/metrics",
        { method: "GET" }
      );
      const res = await GET(req);

      expect(res.status).toBe(401);
    });
  });

  describe("Authorization", () => {
    it("returns 403 for non-SUPER_ADMIN users", async () => {
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        role: "ADMIN",
        email: "test@example.com",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/performance/metrics",
        { method: "GET" }
      );
      const res = await GET(req);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("SUPER_ADMIN");
    });

    it("returns 403 for USER role", async () => {
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        role: "USER",
        email: "test@example.com",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/performance/metrics",
        { method: "GET" }
      );
      const res = await GET(req);

      expect(res.status).toBe(403);
    });
  });

  describe("Success Cases", () => {
    it("returns performance stats for SUPER_ADMIN", async () => {
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        role: "SUPER_ADMIN",
        email: "admin@example.com",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/performance/metrics",
        { method: "GET" }
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("totalRequests");
    });

    it("returns recent metrics when type=recent", async () => {
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        role: "SUPER_ADMIN",
        email: "admin@example.com",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/performance/metrics?type=recent",
        { method: "GET" }
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("respects limit parameter", async () => {
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        role: "SUPER_ADMIN",
        email: "admin@example.com",
      });
      
      // Mock returns more items than the limit to test that limit is enforced
      mockGetRecentMetrics.mockReturnValue([
        { timestamp: Date.now() - 1000, latency: 41, path: "/api/test1" },
        { timestamp: Date.now() - 2000, latency: 42, path: "/api/test2" },
        { timestamp: Date.now() - 3000, latency: 43, path: "/api/test3" },
        { timestamp: Date.now() - 4000, latency: 44, path: "/api/test4" },
        { timestamp: Date.now() - 5000, latency: 45, path: "/api/test5" },
        { timestamp: Date.now() - 6000, latency: 46, path: "/api/test6" },
        { timestamp: Date.now() - 7000, latency: 47, path: "/api/test7" },
        { timestamp: Date.now() - 8000, latency: 48, path: "/api/test8" },
        { timestamp: Date.now() - 9000, latency: 49, path: "/api/test9" },
        { timestamp: Date.now() - 10000, latency: 50, path: "/api/test10" },
        { timestamp: Date.now() - 11000, latency: 51, path: "/api/test11" },
        { timestamp: Date.now() - 12000, latency: 52, path: "/api/test12" },
      ]);

      const req = new NextRequest(
        "http://localhost:3000/api/performance/metrics?type=recent&limit=10",
        { method: "GET" }
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      // Verify limit is respected - should have at most 10 items
      expect(data.data.length).toBeLessThanOrEqual(10);
      // Verify getRecentMetrics was called with the correct limit parameter
      expect(mockGetRecentMetrics).toHaveBeenCalledWith(10);
    });
  });
});
