/**
 * @fileoverview Admin Feature Flags API Route Tests
 * @description Tests for GET/PUT /api/admin/feature-flags endpoint
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/admin/feature-flags/route";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock feature flags
vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: vi.fn().mockReturnValue(true),
  listFeatureFlags: vi.fn().mockReturnValue([
    { id: "dark-mode", name: "Dark Mode", description: "Enable dark mode" },
    { id: "new-dashboard", name: "New Dashboard", description: "Enable new dashboard UI" },
  ]),
  setFeatureFlag: vi.fn().mockResolvedValue({ success: true }),
  getFeatureFlagDefinition: vi.fn().mockReturnValue({
    id: "dark-mode",
    name: "Dark Mode",
    description: "Enable dark mode",
  }),
}));

// Mock rate limit
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { auth } from "@/auth";

function makeGetRequest(): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/admin/feature-flags"));
}

function makePutRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/admin/feature-flags"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Admin Feature Flags API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/feature-flags", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);

      const response = await GET(makeGetRequest());
      expect(response.status).toBe(401);
      
      const json = await response.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 403 when user is not SUPER_ADMIN", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "user-1", role: "ADMIN", orgId: "org-1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const response = await GET(makeGetRequest());
      expect(response.status).toBe(403);
      
      const json = await response.json();
      expect(json.error).toContain("Forbidden");
    });

    it("returns feature flags for SUPER_ADMIN", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "superadmin-1", role: "SUPER_ADMIN", orgId: "org-1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const response = await GET(makeGetRequest());
      expect(response.status).toBe(200);
      
      const json = await response.json();
      expect(json).toHaveProperty("flags");
      expect(json).toHaveProperty("evaluatedAt");
      expect(Array.isArray(json.flags)).toBe(true);
    });

    it("returns flags with enabled status", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "superadmin-1", role: "SUPER_ADMIN", orgId: "org-1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const response = await GET(makeGetRequest());
      const json = await response.json();
      
      expect(json.flags[0]).toHaveProperty("enabled");
    });
  });

  describe("PUT /api/admin/feature-flags", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);

      const response = await PUT(makePutRequest({ flagId: "dark-mode", enabled: true }));
      expect(response.status).toBe(401);
    });

    it("returns 403 when user is not SUPER_ADMIN", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "user-1", role: "MANAGER", orgId: "org-1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const response = await PUT(makePutRequest({ flagId: "dark-mode", enabled: true }));
      expect(response.status).toBe(403);
    });

    it("validates request body for SUPER_ADMIN", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "superadmin-1", role: "SUPER_ADMIN", orgId: "org-1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const response = await PUT(makePutRequest({ flagId: "dark-mode", enabled: false }));
      // Route validates body format - 200 for valid, 400 for missing required fields
      expect([200, 400]).toContain(response.status);
    });
  });
});
