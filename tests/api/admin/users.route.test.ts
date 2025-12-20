/**
 * @fileoverview Tests for /api/admin/users route
 * @description SUPER_ADMIN only access to user management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/admin/users/route";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/mongo", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  buildOrgAwareRateLimitKey: vi.fn(() => "rate-limit-key"),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() =>
    new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    })
  ),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("mongoose", () => {
  const mockUserModel = {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { _id: "user1", name: "Test User", email: "test@example.com", role: "TECHNICIAN" },
      ]),
    }),
    countDocuments: vi.fn().mockResolvedValue(1),
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
    create: vi.fn().mockResolvedValue({
      _id: "newuser1",
      name: "New User",
      email: "new@example.com",
      role: "TECHNICIAN",
    }),
  };

  return {
    Schema: vi.fn(() => ({})),
    model: vi.fn(() => mockUserModel),
    models: {},
    connection: { readyState: 1 },
  };
});

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { auth } from "@/auth";
import { smartRateLimit } from "@/server/security/rateLimit";

const mockAuth = vi.mocked(auth);
const mockRateLimit = vi.mocked(smartRateLimit);

function createRequest(
  method: string,
  searchParams?: Record<string, string>,
  body?: object,
): NextRequest {
  const url = new URL("http://localhost:3000/api/admin/users");
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(url, init);
}

describe("API /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ allowed: true });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/admin/users", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const req = createRequest("GET");
      const res = await GET(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 403 when not SUPER_ADMIN", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "user1", role: "ADMIN", orgId: "org1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const req = createRequest("GET");
      const res = await GET(req);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Forbidden");
    });

    // Note: DB integration tests require MongoMemoryServer setup
    // These are marked .todo for future integration test expansion
    it.todo("returns users list for SUPER_ADMIN (requires DB integration)")

    it.todo("accepts pagination parameters (requires DB integration)")

    it.todo("caps limit to 1000 (requires DB integration)");

    it("enforces rate limiting", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin1", role: "SUPER_ADMIN", orgId: "org1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      mockRateLimit.mockResolvedValueOnce({ allowed: false });

      const req = createRequest("GET");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });
  });

  describe("POST /api/admin/users", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const req = createRequest("POST", undefined, {
        name: "New User",
        email: "new@example.com",
        password: "SecurePass123",
        role: "TECHNICIAN",
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 403 when not SUPER_ADMIN", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "user1", role: "ADMIN", orgId: "org1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const req = createRequest("POST", undefined, {
        name: "New User",
        email: "new@example.com",
        password: "SecurePass123",
        role: "TECHNICIAN",
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
    });

    it("returns 400 when required fields are missing", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin1", role: "SUPER_ADMIN", orgId: "org1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const req = createRequest("POST", undefined, {
        name: "New User",
        // missing email and password
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("enforces rate limiting for POST", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin1", role: "SUPER_ADMIN", orgId: "org1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      mockRateLimit.mockResolvedValueOnce({ allowed: false });

      const req = createRequest("POST", undefined, {
        name: "New User",
        email: "new@example.com",
        password: "SecurePass123",
        role: "TECHNICIAN",
      });
      const res = await POST(req);

      expect(res.status).toBe(429);
    });
  });
});
