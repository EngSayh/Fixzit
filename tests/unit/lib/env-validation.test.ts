/**
 * Environment Validation Tests
 *
 * Tests for lib/env-validation.ts config status functions.
 * Updated for Taqnyat-only SMS provider (CITC-compliant for Saudi Arabia).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe("Environment Validation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("getConfigStatus", () => {
    describe("Taqnyat configuration", () => {
      it("returns configured: false when neither key is set", async () => {
        vi.stubEnv("TAQNYAT_BEARER_TOKEN", "");
        vi.stubEnv("TAQNYAT_SENDER_NAME", "");
        
        const { getConfigStatus } = await import("@/lib/env-validation");
        const status = getConfigStatus();
        
        expect(status.taqnyat.configured).toBe(false);
      });

      it("returns configured: false when only BEARER_TOKEN is set", async () => {
        vi.stubEnv("TAQNYAT_BEARER_TOKEN", "test-bearer-token");
        vi.stubEnv("TAQNYAT_SENDER_NAME", "");
        
        vi.resetModules();
        const { getConfigStatus } = await import("@/lib/env-validation");
        const status = getConfigStatus();
        
        expect(status.taqnyat.configured).toBe(false);
      });

      it("returns configured: false when only SENDER_NAME is set", async () => {
        vi.stubEnv("TAQNYAT_BEARER_TOKEN", "");
        vi.stubEnv("TAQNYAT_SENDER_NAME", "FIXZIT");
        
        vi.resetModules();
        const { getConfigStatus } = await import("@/lib/env-validation");
        const status = getConfigStatus();
        
        expect(status.taqnyat.configured).toBe(false);
      });

      it("returns configured: true when BOTH keys are set", async () => {
        vi.stubEnv("TAQNYAT_BEARER_TOKEN", "test-bearer-token");
        vi.stubEnv("TAQNYAT_SENDER_NAME", "FIXZIT");
        
        vi.resetModules();
        const { getConfigStatus } = await import("@/lib/env-validation");
        const status = getConfigStatus();
        
        expect(status.taqnyat.configured).toBe(true);
      });
    });

    describe("Redis configuration", () => {
      it("returns configured: true when REDIS_URL is set", async () => {
        vi.stubEnv("REDIS_URL", "redis://localhost:6379");
        vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
        
        vi.resetModules();
        const { getConfigStatus } = await import("@/lib/env-validation");
        const status = getConfigStatus();
        
        expect(status.redis.configured).toBe(true);
      });

      it("returns configured: true when UPSTASH_REDIS_REST_URL is set", async () => {
        vi.stubEnv("REDIS_URL", "");
        vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash-url");
        
        vi.resetModules();
        const { getConfigStatus } = await import("@/lib/env-validation");
        const status = getConfigStatus();
        
        expect(status.redis.configured).toBe(true);
      });

      it("returns configured: false when neither Redis env is set", async () => {
        vi.stubEnv("REDIS_URL", "");
        vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
        
        vi.resetModules();
        const { getConfigStatus } = await import("@/lib/env-validation");
        const status = getConfigStatus();
        
        expect(status.redis.configured).toBe(false);
      });
    });
  });
});
