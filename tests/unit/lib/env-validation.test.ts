/**
 * Environment Validation Tests
 *
 * Tests for lib/env-validation.ts config status functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Environment Validation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("getConfigStatus", () => {
    describe("Unifonic configuration", () => {
      it("returns configured: false when neither key is set", async () => {
        vi.stubEnv("UNIFONIC_APP_SID", "");
        vi.stubEnv("UNIFONIC_SENDER_ID", "");
        
        const { getConfigStatus } = await import("@/lib/env-validation");
        const status = getConfigStatus();
        
        expect(status.unifonic.configured).toBe(false);
      });

      it("returns configured: false when only APP_SID is set", async () => {
        vi.stubEnv("UNIFONIC_APP_SID", "test-app-sid");
        vi.stubEnv("UNIFONIC_SENDER_ID", "");
        
        vi.resetModules();
        const { getConfigStatus } = await import("@/lib/env-validation");
        const status = getConfigStatus();
        
        expect(status.unifonic.configured).toBe(false);
      });

      it("returns configured: false when only SENDER_ID is set", async () => {
        vi.stubEnv("UNIFONIC_APP_SID", "");
        vi.stubEnv("UNIFONIC_SENDER_ID", "test-sender-id");
        
        vi.resetModules();
        const { getConfigStatus } = await import("@/lib/env-validation");
        const status = getConfigStatus();
        
        expect(status.unifonic.configured).toBe(false);
      });

      it("returns configured: true when BOTH keys are set", async () => {
        vi.stubEnv("UNIFONIC_APP_SID", "test-app-sid");
        vi.stubEnv("UNIFONIC_SENDER_ID", "test-sender-id");
        
        vi.resetModules();
        const { getConfigStatus } = await import("@/lib/env-validation");
        const status = getConfigStatus();
        
        expect(status.unifonic.configured).toBe(true);
      });
    });

    describe("Twilio configuration", () => {
      it("returns configured: false when any key is missing", async () => {
        vi.stubEnv("TWILIO_ACCOUNT_SID", "test-sid");
        vi.stubEnv("TWILIO_AUTH_TOKEN", "");
        vi.stubEnv("TWILIO_PHONE_NUMBER", "+1234567890");
        
        vi.resetModules();
        const { getConfigStatus } = await import("@/lib/env-validation");
        const status = getConfigStatus();
        
        expect(status.twilio.configured).toBe(false);
      });

      it("returns configured: true when all three keys are set", async () => {
        vi.stubEnv("TWILIO_ACCOUNT_SID", "test-sid");
        vi.stubEnv("TWILIO_AUTH_TOKEN", "test-token");
        vi.stubEnv("TWILIO_PHONE_NUMBER", "+1234567890");
        
        vi.resetModules();
        const { getConfigStatus } = await import("@/lib/env-validation");
        const status = getConfigStatus();
        
        expect(status.twilio.configured).toBe(true);
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
