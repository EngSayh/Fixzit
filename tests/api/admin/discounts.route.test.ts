/**
 * @fileoverview Tests for /api/admin/discounts route
 * @description SUPER_ADMIN only access to discount rules management (tenant-scoped)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/admin/discounts/route";

// Mock dependencies
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth", () => ({
  getUserFromToken: vi.fn(),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  buildOrgAwareRateLimitKey: vi.fn(() => "rate-limit-key"),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((body, status, _req) => {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() =>
    new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    })
  ),
  zodValidationError: vi.fn((error) =>
    new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  ),
}));

vi.mock("@/server/models/DiscountRule", () => ({
  default: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        key: "ANNUAL",
        percentage: 10,
        orgId: "org1",
      }),
    }),
    findOneAndUpdate: vi.fn().mockResolvedValue({
      key: "ANNUAL",
      percentage: 15,
      orgId: "org1",
    }),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { getUserFromToken } from "@/lib/auth";
import { smartRateLimit } from "@/server/security/rateLimit";
import DiscountRule from "@/server/models/DiscountRule";

const mockGetUserFromToken = vi.mocked(getUserFromToken);
const mockRateLimit = vi.mocked(smartRateLimit);
const mockDiscountRule = vi.mocked(DiscountRule);

function createRequest(
  method: string,
  body?: object,
  token?: string,
): NextRequest {
  const url = "http://localhost:3000/api/admin/discounts";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const init: RequestInit = {
    method,
    headers,
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(url, init);
}

describe("API /api/admin/discounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    mockRateLimit.mockResolvedValue({ allowed: true });
    mockGetUserFromToken.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/admin/discounts", () => {
    it("returns 401 when no token provided", async () => {
      const req = createRequest("GET");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 401 when token is invalid", async () => {
      mockGetUserFromToken.mockResolvedValueOnce(null);

      const req = createRequest("GET", undefined, "invalid-token");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 403 when not SUPER_ADMIN", async () => {
      mockGetUserFromToken.mockResolvedValueOnce({
        id: "user1",
        role: "ADMIN",
        orgId: "org1",
      } as any);

      const req = createRequest("GET", undefined, "valid-token");
      const res = await GET(req);

      expect(res.status).toBe(403);
    });

    it("returns 400 when orgId is missing", async () => {
      mockGetUserFromToken.mockResolvedValueOnce({
        id: "admin1",
        role: "SUPER_ADMIN",
        // No orgId
      } as any);

      const req = createRequest("GET", undefined, "valid-token");
      const res = await GET(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Organization");
    });

    // Note: DB integration tests require MongoMemoryServer setup
    it.todo("returns discount rules for SUPER_ADMIN with orgId (requires DB integration)");
  });

  describe("PUT /api/admin/discounts", () => {
    it("returns 401 when no token provided", async () => {
      const req = createRequest("PUT", { value: 15 });
      const res = await PUT(req);

      expect(res.status).toBe(401);
    });

    it("returns 403 when not SUPER_ADMIN", async () => {
      mockGetUserFromToken.mockResolvedValueOnce({
        id: "user1",
        role: "MANAGER",
        orgId: "org1",
      } as any);

      const req = createRequest("PUT", { value: 15 }, "valid-token");
      const res = await PUT(req);

      expect(res.status).toBe(403);
    });

    it("returns 400 when orgId is missing", async () => {
      mockGetUserFromToken.mockResolvedValueOnce({
        id: "admin1",
        role: "SUPER_ADMIN",
      } as any);

      const req = createRequest("PUT", { value: 15 }, "valid-token");
      const res = await PUT(req);

      expect(res.status).toBe(400);
    });

    it.todo("validates discount value is within range (requires DB integration)");
  });
});
