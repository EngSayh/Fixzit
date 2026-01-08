/**
 * @fileoverview Tests for /api/admin/testing-users
 * Sprint 32: Admin coverage improvement
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/testing-users/route";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/TestingUser", () => ({
  TestingUser: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
  TestingUserStatus: ["active", "inactive"],
  TestingUserRole: ["tester", "qa"],
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { auth } from "@/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

describe("GET /api/admin/testing-users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore mocks
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@test.com", role: "SUPER_ADMIN" },
      expires: "2099-01-01",
    });
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(enforceRateLimit).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    );

    const req = new NextRequest("http://localhost/api/admin/testing-users");
    const res = await GET(req);

    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost/api/admin/testing-users");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("returns 403 when not SUPER_ADMIN", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "test@test.com", role: "USER" },
      expires: "2099-01-01",
    });

    const req = new NextRequest("http://localhost/api/admin/testing-users");
    const res = await GET(req);

    expect(res.status).toBe(403);
  });
});
