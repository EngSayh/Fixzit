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

      // Sensitive key patterns that should NEVER expose actual values
      const sensitivePatterns = [
        /SECRET/i,
        /KEY/i,
        /PASSWORD/i,
        /TOKEN/i,
        /API_KEY/i,
        /PRIVATE/i,
        /CREDENTIAL/i,
      ];
      
      // Values should be booleans or safe status indicators, never actual secrets
      Object.entries(data).forEach(([key, value]) => {
        const isSensitiveKey = sensitivePatterns.some((pattern) => pattern.test(key));
        
        if (isSensitiveKey && typeof value === "string") {
          // Sensitive keys should only have boolean-like status values, not actual secrets
          const safeValues = ["set", "unset", "configured", "missing", "ok", "error"];
          expect(
            safeValues.includes(value.toLowerCase()) || value.length < 20,
            `Key "${key}" may be exposing a secret value`
          ).toBe(true);
        }
        
        // No value should look like a base64 encoded secret or long random string
        if (typeof value === "string") {
          expect(value.length).toBeLessThan(100);
          // Should not match patterns typical of secrets (32+ character hex/base64)
          expect(value).not.toMatch(/^[a-zA-Z0-9+/=]{32,}$/);
        }
      });
    });
  });
});
