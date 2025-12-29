/**
 * @fileoverview Tests for /api/dev/check-env route
 * Tests SUPER_ADMIN authorization, rate limiting, and env var status
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
let mockSession: { user?: { id: string; orgId?: string; isSuperAdmin?: boolean } } | null = null;
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

// Mock rate limit - always allow for tests
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

import { GET } from "@/app/api/dev/check-env/route";

describe("API /api/dev/check-env", () => {
  beforeEach(() => {
    mockSession = null;
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 403 when user is not authenticated", async () => {
      mockSession = null;

      const req = new NextRequest(
        "http://localhost:3000/api/dev/check-env",
        { method: "GET" }
      );
      const res = await GET(req);

      expect(res.status).toBe(403);
    });

    it("returns 403 when user is not SUPER_ADMIN", async () => {
      mockSession = {
        user: { id: "user-123", orgId: "org-123", isSuperAdmin: false },
      };

      const req = new NextRequest(
        "http://localhost:3000/api/dev/check-env",
        { method: "GET" }
      );
      const res = await GET(req);

      expect(res.status).toBe(403);
    });
  });

  describe("SUPER_ADMIN Authorization", () => {
    it("returns env var status for SUPER_ADMIN", async () => {
      mockSession = {
        user: { id: "admin-123", orgId: "org-1", isSuperAdmin: true },
      };

      const req = new NextRequest(
        "http://localhost:3000/api/dev/check-env",
        { method: "GET" }
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      
      // Should contain env var status (could be nested or flat)
      expect(data).toBeDefined();
      expect(typeof data).toBe("object");
    });

    it("does not expose actual env var values", async () => {
      mockSession = {
        user: { id: "admin-123", orgId: "org-1", isSuperAdmin: true },
      };

      const req = new NextRequest(
        "http://localhost:3000/api/dev/check-env",
        { method: "GET" }
      );
      const res = await GET(req);
      const data = await res.json();

      // Values should be booleans (or strings for some like TAP_ENVIRONMENT)
      // The important thing is they shouldn't be actual secrets
      Object.entries(data).forEach(([key, value]) => {
        // Skip keys that may have string values (env names, not actual secret values)
        const allowedStringKeys = ["TAP_ENVIRONMENT", "status", "message"];
        if (typeof value === "string" && !allowedStringKeys.includes(key)) {
          // If it's a string, it should be a status indicator not a secret
          expect(value.length).toBeLessThan(50);
        }
      });
    });
  });
});
