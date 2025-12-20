/**
 * @fileoverview Tests for /api/admin/feature-flags route
 * @description SUPER_ADMIN only access to feature flags management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/admin/feature-flags/route";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: vi.fn(() => true),
  listFeatureFlags: vi.fn(() => [
    { id: "marketplace", name: "Marketplace", defaultEnabled: true },
    { id: "dark-mode", name: "Dark Mode", defaultEnabled: false },
  ]),
  setFeatureFlag: vi.fn(() => true),
  getFeatureFlagDefinition: vi.fn((id: string) => {
    if (id === "marketplace") {
      return { id: "marketplace", name: "Marketplace", defaultEnabled: true };
    }
    return null;
  }),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { auth } from "@/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { listFeatureFlags, getFeatureFlagDefinition, setFeatureFlag } from "@/lib/feature-flags";

const mockAuth = vi.mocked(auth);
const mockRateLimit = vi.mocked(enforceRateLimit);
const mockListFlags = vi.mocked(listFeatureFlags);
const mockGetFlagDef = vi.mocked(getFeatureFlagDefinition);
const mockSetFlag = vi.mocked(setFeatureFlag);

function createRequest(
  method: string,
  body?: object,
): NextRequest {
  const url = "http://localhost:3000/api/admin/feature-flags";
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(url, init);
}

describe("API /api/admin/feature-flags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockReturnValue(null);
    mockListFlags.mockReturnValue([
      { id: "marketplace", name: "Marketplace", defaultEnabled: true },
      { id: "dark-mode", name: "Dark Mode", defaultEnabled: false },
    ]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/admin/feature-flags", () => {
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
        user: { id: "user1", role: "TECHNICIAN", orgId: "org1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const req = createRequest("GET");
      const res = await GET(req);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Forbidden");
    });

    it("returns feature flags list for SUPER_ADMIN", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin1", role: "SUPER_ADMIN", orgId: "org1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const req = createRequest("GET");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.flags).toBeDefined();
      expect(Array.isArray(data.flags)).toBe(true);
      expect(data.evaluatedAt).toBeDefined();
    });

    it("enforces rate limiting", async () => {
      mockRateLimit.mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        })
      );

      const req = createRequest("GET");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });
  });

  describe("PUT /api/admin/feature-flags", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const req = createRequest("PUT", { id: "marketplace", enabled: false });
      const res = await PUT(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 403 when not SUPER_ADMIN", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "user1", role: "ADMIN", orgId: "org1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const req = createRequest("PUT", { id: "marketplace", enabled: false });
      const res = await PUT(req);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Forbidden");
    });

    it("returns 400 when body is invalid", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin1", role: "SUPER_ADMIN", orgId: "org1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const req = createRequest("PUT", { id: "marketplace" }); // missing enabled
      const res = await PUT(req);

      expect(res.status).toBe(400);
    });

    it("returns 404 for unknown feature flag", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "admin1", role: "SUPER_ADMIN", orgId: "org1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      mockGetFlagDef.mockReturnValueOnce(null);

      const req = createRequest("PUT", { id: "unknown-flag", enabled: true });
      const res = await PUT(req);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("Unknown");
    });
  });
});
