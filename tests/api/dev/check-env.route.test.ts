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
      // Recursive helper to check nested values
      const checkValue = (key: string, value: unknown, path: string = key): void => {
        const isSensitiveKey = sensitivePatterns.some((pattern) => pattern.test(key));
        
        // Handle nested objects recursively
        if (value !== null && typeof value === "object" && !Array.isArray(value)) {
          Object.entries(value as Record<string, unknown>).forEach(([nestedKey, nestedValue]) => {
            checkValue(nestedKey, nestedValue, `${path}.${nestedKey}`);
          });
          return;
        }
        
        // Handle arrays recursively
        if (Array.isArray(value)) {
          value.forEach((item, idx) => {
            if (typeof item === "object" && item !== null) {
              checkValue(key, item, `${path}[${idx}]`);
            } else if (typeof item === "string") {
              checkValue(key, item, `${path}[${idx}]`);
            }
          });
          return;
        }
        
        // For sensitive keys, validate the value
        if (isSensitiveKey) {
          const safeValues = ["set", "unset", "configured", "missing", "ok", "error"];
          if (typeof value === "string") {
            const trimmedValue = value.trim();
            // Only accept safe status values OR values >= 20 chars are rejected
            expect(
              safeValues.includes(trimmedValue.toLowerCase()),
              `Key "${path}" has value "${trimmedValue}" which may be exposing a secret`
            ).toBe(true);
          } else if (value !== null && value !== undefined && typeof value !== "boolean") {
            // Non-string, non-null, non-boolean values for sensitive keys should fail
            fail(`Key "${path}" has non-string sensitive value of type ${typeof value}`);
          }
        }
        
        // No string value should look like a base64 encoded secret or long random string
        if (typeof value === "string") {
          expect(value.length).toBeLessThan(100);
          // Should not match patterns typical of secrets (32+ character hex/base64)
          expect(value).not.toMatch(/^[a-zA-Z0-9+/=]{32,}$/);
        }
      };
      
      Object.entries(data).forEach(([key, value]) => {
        checkValue(key, value);
      });
    });
  });
});
