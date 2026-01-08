/**
 * @fileoverview Tests for Superadmin Roles Route
 * @route GET/POST /api/superadmin/roles
 * @sprint Sprint 37
 * @agent [AGENT-680-FULL]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock dependencies before imports
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn(),
}));

vi.mock("@/server/models/Role", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { _id: "role-1", name: "Admin", permissions: ["read", "write"] },
          { _id: "role-2", name: "User", permissions: ["read"] },
        ]),
      }),
    }),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(() => ({
    data: { name: "NewRole", permissions: ["read"] },
    error: null,
  })),
}));

import { GET, POST } from "@/app/api/superadmin/roles/route";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockGetSuperadminSession = vi.mocked(getSuperadminSession);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("Superadmin Roles Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
  });

  describe("GET /api/superadmin/roles", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/superadmin/roles");
      const res = await GET(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain("Unauthorized");
    });

    it("returns roles list for authenticated superadmin", async () => {
      mockGetSuperadminSession.mockResolvedValue({
        username: "superadmin",
        userId: "sa-1",
        role: "SUPER_ADMIN",
      });

      const req = new NextRequest("http://localhost/api/superadmin/roles");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.roles).toBeDefined();
      expect(body.total).toBeDefined();
    });

    it("enforces rate limiting", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      );

      const req = new NextRequest("http://localhost/api/superadmin/roles");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });
  });

  describe("POST /api/superadmin/roles", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/superadmin/roles", {
        method: "POST",
        body: JSON.stringify({ name: "NewRole", permissions: ["read"] }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("enforces rate limiting on POST", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      );

      const req = new NextRequest("http://localhost/api/superadmin/roles", {
        method: "POST",
        body: JSON.stringify({ name: "NewRole", permissions: ["read"] }),
      });
      const res = await POST(req);

      expect(res.status).toBe(429);
    });
  });
});
