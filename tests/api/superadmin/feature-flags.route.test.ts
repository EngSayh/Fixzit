/**
 * @fileoverview Tests for Superadmin Feature Flags Route
 * @route GET/PUT /api/superadmin/feature-flags
 * @sprint Sprint 37
 * @agent [AGENT-680-FULL]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock dependencies before imports
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
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

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: vi.fn(() => true),
  listFeatureFlags: vi.fn(() => [
    { id: "dark-mode", name: "Dark Mode", description: "Enable dark mode" },
    { id: "new-dashboard", name: "New Dashboard", description: "Enable new dashboard" },
  ]),
  setFeatureFlag: vi.fn(),
  getFeatureFlagDefinition: vi.fn(),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(() => ({
    data: { flagId: "dark-mode", enabled: true },
    error: null,
  })),
}));

import { GET, PUT } from "@/app/api/superadmin/feature-flags/route";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockGetSuperadminSession = vi.mocked(getSuperadminSession);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("Superadmin Feature Flags Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
  });

  describe("GET /api/superadmin/feature-flags", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/superadmin/feature-flags");
      const res = await GET(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain("Unauthorized");
    });

    it("returns feature flags list for authenticated superadmin", async () => {
      mockGetSuperadminSession.mockResolvedValue({
        username: "superadmin",
        userId: "sa-1",
        role: "SUPER_ADMIN",
      });

      const req = new NextRequest("http://localhost/api/superadmin/feature-flags");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.flags).toBeDefined();
      expect(body.evaluatedAt).toBeDefined();
    });

    it("enforces rate limiting", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      );

      const req = new NextRequest("http://localhost/api/superadmin/feature-flags");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });
  });

  describe("PUT /api/superadmin/feature-flags", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/superadmin/feature-flags", {
        method: "PUT",
        body: JSON.stringify({ flagId: "dark-mode", enabled: true }),
      });
      const res = await PUT(req);

      expect(res.status).toBe(401);
    });

    it("enforces rate limiting on PUT", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      );

      const req = new NextRequest("http://localhost/api/superadmin/feature-flags", {
        method: "PUT",
        body: JSON.stringify({ flagId: "dark-mode", enabled: true }),
      });
      const res = await PUT(req);

      expect(res.status).toBe(429);
    });
  });
});
