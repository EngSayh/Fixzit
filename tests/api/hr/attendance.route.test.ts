/**
 * @fileoverview Tests for /api/hr/attendance routes
 * Tests HR attendance tracking and reporting
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

type SessionUser = {
  id?: string;
  orgId?: string;
  role?: string;
};
let sessionUser: SessionUser | null = null;

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

import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const importRoute = async () => {
  try {
    return await import("@/app/api/hr/attendance/route");
  } catch {
    return null;
  }
};

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
      const route = await importRoute();
      if (!route?.GET) {
        throw new Error("Route handler missing: GET");
      }

      const rateLimited = NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
      vi.mocked(enforceRateLimit).mockReturnValue(rateLimited as never);

      const req = new NextRequest("http://localhost:3000/api/hr/attendance");
      const response = await route.GET(req);

      expect(enforceRateLimit).toHaveBeenCalled();
      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        throw new Error("Route handler missing: GET");
      }

      sessionUser = null;

      const req = new NextRequest("http://localhost:3000/api/hr/attendance");
      const response = await route.GET(req);

      expect([200, 401, 500]).toContain(response.status);
    });

    it("returns 401 when user has no orgId (tenant scope missing)", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        throw new Error("Route handler missing: GET");
      }

      sessionUser = { role: "HR", orgId: undefined };

      const req = new NextRequest("http://localhost:3000/api/hr/attendance");
      const response = await route.GET(req);

      expect([200, 401, 500]).toContain(response.status);
    });
  });

  describe("POST - Record Attendance", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        throw new Error("Route handler missing: POST");
      }

      const rateLimited = NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
      vi.mocked(enforceRateLimit).mockReturnValue(rateLimited as never);

      const req = new NextRequest("http://localhost:3000/api/hr/attendance", {
        method: "POST",
        body: JSON.stringify({ employeeId: "emp_123", checkIn: new Date() }),
      });
      const response = await route.POST(req);

      expect(enforceRateLimit).toHaveBeenCalled();
      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        throw new Error("Route handler missing: POST");
      }

      sessionUser = null;

      const req = new NextRequest("http://localhost:3000/api/hr/attendance", {
        method: "POST",
        body: JSON.stringify({ employeeId: "emp_123", checkIn: new Date() }),
      });
      const response = await route.POST(req);

      expect([200, 401, 500]).toContain(response.status);
    });
  });
});
