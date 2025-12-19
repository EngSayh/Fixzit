/**
 * CORS Security Tests
 * Verifies that CORS allowlist works correctly
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { isOriginAllowed, parseOrigins } from "@/lib/security/cors-allowlist";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


vi.mock("@/lib/monitoring/security-events", () => ({
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("CORS Security Tests", () => {
  describe("Production CORS", () => {
    beforeAll(() => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("PLAYWRIGHT", "false");
      vi.stubEnv("NEXT_PUBLIC_E2E", "false");
    });

    afterAll(() => {
      vi.unstubAllEnvs();
    });

    it("should allow production origins", () => {
      expect(isOriginAllowed("https://fixzit.sa")).toBe(true);
      expect(isOriginAllowed("https://www.fixzit.sa")).toBe(true);
      expect(isOriginAllowed("https://app.fixzit.sa")).toBe(true);
      expect(isOriginAllowed("https://dashboard.fixzit.sa")).toBe(true);
    });

    it("should block unauthorized origins", () => {
      expect(isOriginAllowed("https://evil.com")).toBe(false);
      expect(isOriginAllowed("http://malicious.site")).toBe(false);
    });

    it("should block localhost in production", () => {
      expect(isOriginAllowed("http://localhost:3000")).toBe(false);
      expect(isOriginAllowed("http://127.0.0.1:3000")).toBe(false);
    });

    it("should reject null origin in production", () => {
      expect(isOriginAllowed(null)).toBe(false);
    });
  });

  describe("Development CORS", () => {
    beforeAll(() => {
      vi.stubEnv("NODE_ENV", "development");
    });

    afterAll(() => {
      vi.unstubAllEnvs();
    });

    it("should allow localhost in development", () => {
      expect(isOriginAllowed("http://localhost:3000")).toBe(true);
      expect(isOriginAllowed("http://localhost:3001")).toBe(true);
    });

    it("should allow null origin in development (same-origin)", () => {
      expect(isOriginAllowed(null)).toBe(true);
    });

    it("should still allow production origins in development", () => {
      expect(isOriginAllowed("https://fixzit.sa")).toBe(true);
    });
  });

  describe("CORS parseOrigins validation", () => {
    it("should reject invalid URLs", () => {
      vi.stubEnv("NODE_ENV", "development");
      const origins = parseOrigins(
        "not-a-url, http://valid.com , missing-scheme",
      );
      expect(origins).toEqual(["http://valid.com"]);
      vi.unstubAllEnvs();
    });

    it("should reject non-http(s) protocols", () => {
      vi.stubEnv("NODE_ENV", "development");
      const origins = parseOrigins(
        "ftp://example.com,https://good.com,file:///tmp/test",
      );
      expect(origins).toEqual(["https://good.com"]);
      vi.unstubAllEnvs();
    });
  });
});
