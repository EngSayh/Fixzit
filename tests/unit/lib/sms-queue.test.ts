/**
 * SMS Queue Unit Tests
 *
 * Focused on provider candidate selection and credential handling.
 * 
 * IMPORTANT: Taqnyat is the ONLY production SMS provider for Fixzit.
 * All other providers (Twilio, Unifonic, AWS SNS, Nexmo) have been removed.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { decryptProviderToken, buildProviderCandidates, checkOrgRateLimit } from "@/lib/queues/sms-queue";
import { getRedisClient } from "@/lib/redis";

// Mock encryption to make decryptProviderToken deterministic
vi.mock("@/lib/security/encryption", () => ({
  decryptField: vi.fn((value: string) => {
    if (!value) return null;
    return value.startsWith("v1:") ? value.replace("v1:", "decrypted:") : value;
  }),
}));

// Mock Redis client for rate limiter tests
vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn(() => null),
}));

vi.mock("@/server/models/SMSSettings", () => ({
  SMSSettings: {
    getEffectiveSettings: vi.fn(async () => ({ globalRateLimitPerMinute: 30 })),
  },
}));

describe("SMS Queue - Provider utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up Taqnyat env vars (the only production provider)
    delete process.env.TAQNYAT_BEARER_TOKEN;
    delete process.env.TAQNYAT_SENDER_NAME;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Ensure cleanup after each test
    delete process.env.TAQNYAT_BEARER_TOKEN;
    delete process.env.TAQNYAT_SENDER_NAME;
  });

  describe("decryptProviderToken", () => {
    it("returns undefined for empty input", () => {
      expect(decryptProviderToken(undefined)).toBeUndefined();
    });

    it("decrypts encrypted values", () => {
      expect(decryptProviderToken("v1:secret")).toBe("decrypted:secret");
    });

    it("passes through plain values", () => {
      expect(decryptProviderToken("plain")).toBe("plain");
    });
  });

  describe("buildProviderCandidates", () => {
    it("filters disabled providers and respects supportedTypes", () => {
      // Only TAQNYAT and LOCAL providers are supported
      const settings = {
        defaultProvider: "TAQNYAT",
        providers: [
          { provider: "TAQNYAT", enabled: true, priority: 2, fromNumber: "FIXZIT", encryptedApiKey: "token123" },
          { provider: "TAQNYAT", enabled: false, priority: 1, fromNumber: "FIXZIT2", encryptedApiKey: "token456" },
          { provider: "LOCAL", enabled: true, priority: 3, supportedTypes: ["ALERT"], fromNumber: "local", encryptedApiKey: "local" },
        ],
      } as any;

      const candidates = buildProviderCandidates(settings, "OTP");
      // Only enabled TAQNYAT with matching supportedTypes (or no supportedTypes filter)
      expect(candidates.map((c) => c.name)).toEqual(["TAQNYAT"]);
    });

    it("prefers defaultProvider when sorting", () => {
      const settings = {
        defaultProvider: "LOCAL",
        providers: [
          { provider: "TAQNYAT", enabled: true, priority: 1, fromNumber: "FIXZIT", encryptedApiKey: "v1:token1" },
          { provider: "LOCAL", enabled: true, priority: 5, fromNumber: "local", encryptedApiKey: "v1:token2" },
        ],
      } as any;

      const candidates = buildProviderCandidates(settings, "OTP");
      // LOCAL should come first as it's the defaultProvider despite higher priority number
      expect(candidates[0].name).toBe("LOCAL");
      expect(candidates[1].name).toBe("TAQNYAT");
      // Ensure decryption applied
      expect(candidates[0].bearerToken).toBe("decrypted:token2");
    });

    it("adds env Taqnyat fallback with priority 999", () => {
      // Taqnyat is the ONLY production SMS provider for Fixzit
      process.env.TAQNYAT_BEARER_TOKEN = "env-token";
      process.env.TAQNYAT_SENDER_NAME = "FIXZIT";

      const settings = { defaultProvider: "TAQNYAT", providers: [] } as any;
      const candidates = buildProviderCandidates(settings, "OTP");

      const fallback = candidates.find((c) => c.name === "TAQNYAT");
      expect(fallback).toBeDefined();
      expect(fallback?.priority).toBe(999);
      expect(fallback?.bearerToken).toBe("env-token");
      expect(fallback?.senderName).toBe("FIXZIT");
    });

    it("filters out providers missing required credentials", () => {
      const settings = {
        defaultProvider: "TAQNYAT",
        providers: [
          // Missing senderName (fromNumber is empty)
          { provider: "TAQNYAT", enabled: true, priority: 1, fromNumber: "", encryptedApiKey: "token" },
          // Missing bearerToken (encryptedApiKey is empty)
          { provider: "TAQNYAT", enabled: true, priority: 2, fromNumber: "FIXZIT", encryptedApiKey: "" },
        ],
      } as any;

      const candidates = buildProviderCandidates(settings, "OTP");
      // Both should be filtered out due to missing credentials
      expect(candidates).toEqual([]);
    });
  });
});

describe("SMS Queue - Rate limiter", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fails fast when orgId is missing", async () => {
    const result = await checkOrgRateLimit(undefined);
    expect(result.ok).toBe(false);
  });

  it("allows when Redis is not configured", async () => {
    (getRedisClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const result = await checkOrgRateLimit("org1");
    expect(result.ok).toBe(true);
  });

  it("enforces when count exceeds max", async () => {
    const pttl = vi.fn().mockResolvedValue(5000);
    const incr = vi.fn().mockResolvedValue(31); // max 30
    const pexpire = vi.fn().mockResolvedValue(undefined);
    (getRedisClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ pttl, incr, pexpire });

    const result = await checkOrgRateLimit("org2");
    expect(result.ok).toBe(false);
    expect(result.ttlMs).toBeGreaterThan(0);
  });
});
