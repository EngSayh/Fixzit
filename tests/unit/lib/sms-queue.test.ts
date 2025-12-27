/**
 * SMS Queue Unit Tests
 *
 * Focused on provider candidate selection and credential handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { decryptProviderToken, buildProviderCandidates, checkOrgRateLimit } from "@/lib/queues/sms-queue";
import { getRedisClient } from "@/lib/redis";

// Mock bullmq to avoid resolution errors
vi.mock("bullmq", () => ({
  Queue: vi.fn(),
  Worker: vi.fn(),
}), { virtual: true });

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
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    it("uses Taqnyat when env is configured", () => {
      process.env.TAQNYAT_BEARER_TOKEN = "test-token";
      process.env.TAQNYAT_SENDER_NAME = "TestSender";

      const settings = {
        defaultProvider: "TAQNYAT",
        providers: [],
      } as any;

      const candidates = buildProviderCandidates(settings, "OTP");
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].name).toBe("TAQNYAT");
      expect(candidates[0].bearerToken).toBe("test-token");
    });

    it("filters out providers missing required credentials", () => {
      // Clear Taqnyat env
      delete process.env.TAQNYAT_BEARER_TOKEN;
      delete process.env.TAQNYAT_SENDER_NAME;

      const settings = {
        defaultProvider: "TAQNYAT",
        providers: [
          { provider: "TAQNYAT", enabled: true, priority: 1, fromNumber: "", encryptedApiKey: "" },
        ],
      } as any;

      const candidates = buildProviderCandidates(settings, "OTP");
      expect(candidates).toEqual([]);
    });
  });
});

describe("SMS Queue - Rate limiter", () => {
  beforeEach(() => {
    // Reset to default null (Redis not configured)
    (getRedisClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fails fast when orgId is missing", async () => {
    const result = await checkOrgRateLimit(undefined);
    expect(result.ok).toBe(false);
  });

  it("allows when Redis is not configured", async () => {
    // Default mock returns null
    const result = await checkOrgRateLimit("org1");
    expect(result.ok).toBe(true);
  });

  it("enforces when count exceeds max", async () => {
    const mockRedis = {
      pttl: vi.fn().mockResolvedValue(5000),
      incr: vi.fn().mockResolvedValue(31), // max is 30
      pexpire: vi.fn().mockResolvedValue(undefined),
    };
    (getRedisClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockRedis);

    const result = await checkOrgRateLimit("org2");
    
    // Verify Redis was called
    expect(mockRedis.pttl).toHaveBeenCalled();
    expect(mockRedis.incr).toHaveBeenCalled();
    
    // Rate limit should be enforced (31 > 30)
    expect(result.ok).toBe(false);
    expect((result as { ok: false; ttlMs: number }).ttlMs).toBeGreaterThan(0);
  });
});
