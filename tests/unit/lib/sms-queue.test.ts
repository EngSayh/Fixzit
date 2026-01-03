/**
 * SMS Queue Unit Tests
 *
 * Focused on provider candidate selection and credential handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { decryptProviderToken, buildProviderCandidates, checkOrgRateLimit } from "@/lib/queues/sms-queue";
import type { ISMSSettings } from "@/server/models/SMSSettings";

// Mock encryption to make decryptProviderToken deterministic
vi.mock("@/lib/security/encryption", () => ({
  decryptField: vi.fn((value: string) => {
    if (!value) return null;
    return value.startsWith("v1:") ? value.replace("v1:", "decrypted:") : value;
  }),
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
      } as Pick<ISMSSettings, "defaultProvider" | "providers">;

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
      } as Pick<ISMSSettings, "defaultProvider" | "providers">;

      const candidates = buildProviderCandidates(settings, "OTP");
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

  it("allows when under limit", async () => {
    const result = await checkOrgRateLimit("org1");
    expect(result.ok).toBe(true);
  });

  it("enforces when count exceeds max", async () => {
    let lastResult: { ok: boolean; ttlMs?: number } | undefined;
    for (let i = 0; i < 31; i += 1) {
      lastResult = await checkOrgRateLimit("org2");
    }

    expect(lastResult?.ok).toBe(false);
    expect((lastResult as { ok: false; ttlMs: number }).ttlMs).toBeGreaterThan(0);
  });
});
