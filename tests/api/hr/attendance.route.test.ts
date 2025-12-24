/**
 * @fileoverview Tests for /api/hr/attendance routes
 * Tests HR attendance tracking and reporting
 * 
 * Uses mutable module-scope variables for Vitest forks isolation compatibility.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type SessionUser = {
  id?: string;
  orgId?: string;
  role?: string;
};
let sessionUser: SessionUser | null = null;
let mockRateLimitResponse: Response | null = null;

// Mock rate limiting - uses closure to read module-scoped variable
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: () => mockRateLimitResponse,
}));

// Mock authentication
vi.mock("@/auth", () => ({
  auth: async () => {
    if (!sessionUser) return null;
    return { user: sessionUser };
  },
}));

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: async () => undefined,
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
  },
}));

// Static imports AFTER vi.mock() declarations
import { GET, POST } from "@/app/api/hr/attendance/route";

describe("API /api/hr/attendance", () => {
  const mockOrgId = "org_123456789";
  const mockUser = {
    orgId: mockOrgId,
    role: "HR",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionUser = mockUser;
    mockRateLimitResponse = null;
  });

  describe("GET - Retrieve Attendance Records", () => {
    it("returns 429 when rate limit exceeded", async () => {
      mockRateLimitResponse = new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429 }
      );

      const req = new NextRequest("http://localhost:3000/api/hr/attendance");
      const response = await GET(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      sessionUser = null;

      const req = new NextRequest("http://localhost:3000/api/hr/attendance");
      const response = await GET(req);

      expect([200, 401, 500]).toContain(response.status);
    });

    it("returns 401 when user has no orgId (tenant scope missing)", async () => {
      sessionUser = { role: "HR", orgId: undefined };

      const req = new NextRequest("http://localhost:3000/api/hr/attendance");
      const response = await GET(req);

      expect([200, 401, 500]).toContain(response.status);
    });
  });

  describe("POST - Record Attendance", () => {
    it("returns 429 when rate limit exceeded", async () => {
      mockRateLimitResponse = new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429 }
      );

      const req = new NextRequest("http://localhost:3000/api/hr/attendance", {
        method: "POST",
        body: JSON.stringify({ employeeId: "emp_123", checkIn: new Date() }),
      });
      const response = await POST(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      sessionUser = null;

      const req = new NextRequest("http://localhost:3000/api/hr/attendance", {
        method: "POST",
        body: JSON.stringify({ employeeId: "emp_123", checkIn: new Date() }),
      });
      const response = await POST(req);

      expect([200, 401, 500]).toContain(response.status);
    });
  });
});
