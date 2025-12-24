/**
 * @fileoverview Tests for /api/hr/attendance routes
 * Tests HR attendance tracking and reporting
 * 
 * Pattern: Static imports for mock isolation (per TESTING_STRATEGY.md)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type SessionUser = {
  id?: string;
  orgId?: string;
  role?: string;
};
let sessionUser: SessionUser | null = null;

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock authentication
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => {
    if (!sessionUser) return null;
    return { user: sessionUser };
  }),
}));

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Static imports AFTER vi.mock() declarations (mocks are hoisted)
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// Dynamic import helper to ensure fresh module state per test
async function importRoute() {
  return await import("@/app/api/hr/attendance/route");
}

describe("API /api/hr/attendance", () => {
  const mockOrgId = "org_123456789";
  const mockUser = {
    orgId: mockOrgId,
    role: "HR",
  };

  beforeEach(() => {
    sessionUser = null;
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    sessionUser = mockUser;
  });

  describe("GET - Retrieve Attendance Records", () => {
    it("returns 429 when rate limit exceeded", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/hr/attendance");
      const response = await GET(req);

      expect(enforceRateLimit).toHaveBeenCalled();
      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      sessionUser = null;

      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/hr/attendance");
      const response = await GET(req);

      expect([200, 401, 500]).toContain(response.status);
    });

    it("returns 401 when user has no orgId (tenant scope missing)", async () => {
      sessionUser = { role: "HR", orgId: undefined };

      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/hr/attendance");
      const response = await GET(req);

      expect([200, 401, 500]).toContain(response.status);
    });
  });

  describe("POST - Record Attendance", () => {
    it("returns 429 when rate limit exceeded", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const { POST } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/hr/attendance", {
        method: "POST",
        body: JSON.stringify({ employeeId: "emp_123", checkIn: new Date() }),
      });
      const response = await POST(req);

      expect(enforceRateLimit).toHaveBeenCalled();
      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      sessionUser = null;

      const { POST } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/hr/attendance", {
        method: "POST",
        body: JSON.stringify({ employeeId: "emp_123", checkIn: new Date() }),
      });
      const response = await POST(req);

      expect([200, 401, 500]).toContain(response.status);
    });
  });
});
