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

// Mock performance functions
vi.mock("@/lib/performance", () => ({
  getPerformanceStats: vi.fn().mockReturnValue({
    totalRequests: 1000,
    averageLatency: 50,
    p95Latency: 150,
    errorRate: 0.01,
  }),
  getRecentMetrics: vi.fn().mockReturnValue([
    { timestamp: Date.now(), latency: 45, path: "/api/test" },
  ]),
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
    });
  });
});
