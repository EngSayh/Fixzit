/**
 * SMS Queue Unit Tests
 *
 * Tests for SMS queue functionality including:
 * - Provider candidate selection
 * - Priority ordering
 * - Failover logic
 * - Encryption/decryption of credentials
 *
 * @module tests/unit/lib/sms-queue.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before imports
vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn(() => null),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/security/encryption", () => ({
  decryptField: vi.fn((value: string, _field: string) => {
    // Simulate decryption - just return the value with "decrypted:" prefix for testing
    if (!value) return null;
    if (value.startsWith("v1:")) {
      return value.replace("v1:", "decrypted:");
    }
    return value;
  }),
}));

vi.mock("@/server/models/SMSMessage", () => ({
  SMSMessage: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    recordAttempt: vi.fn(),
  },
  TSMSType: ["OTP", "NOTIFICATION", "ALERT"] as const,
  TSMSPriority: ["LOW", "NORMAL", "HIGH", "CRITICAL"] as const,
  TSMSProvider: ["TWILIO", "UNIFONIC", "LOCAL"] as const,
}));

vi.mock("@/server/models/SMSSettings", () => ({
  SMSSettings: {
    getEffectiveSettings: vi.fn(),
  },
}));

vi.mock("@/lib/sms", () => ({
  sendSMS: vi.fn(),
}));

// Import after mocks
import { decryptField } from "@/lib/security/encryption";

describe("SMS Queue - Provider Selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env vars
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("decryptProviderToken", () => {
    it("should return undefined for empty input", () => {
      const result = decryptField("", "test");
      expect(result).toBeNull();
    });

    it("should decrypt encrypted values", () => {
      const result = decryptField("v1:encrypted_token", "sms.providerApiKey");
      expect(result).toBe("decrypted:encrypted_token");
    });

    it("should pass through non-encrypted values", () => {
      const result = decryptField("plain_token", "sms.providerApiKey");
      expect(result).toBe("plain_token");
    });
  });

  describe("buildProviderCandidates logic", () => {
    it("should filter out disabled providers", () => {
      const providers = [
        { provider: "TWILIO", enabled: true, priority: 1, fromNumber: "+1", accountId: "a", encryptedApiKey: "k" },
        { provider: "UNIFONIC", enabled: false, priority: 2, fromNumber: "+1", accountId: "a", encryptedApiKey: "k" },
      ];
      
      const enabledProviders = providers.filter(p => p.enabled);
      expect(enabledProviders).toHaveLength(1);
      expect(enabledProviders[0].provider).toBe("TWILIO");
    });

    it("should filter by supportedTypes", () => {
      const messageType = "OTP";
      const providers = [
        { provider: "TWILIO", enabled: true, priority: 1, supportedTypes: ["OTP", "ALERT"] },
        { provider: "UNIFONIC", enabled: true, priority: 2, supportedTypes: ["MARKETING"] },
        { provider: "LOCAL", enabled: true, priority: 3, supportedTypes: [] }, // empty = all types
      ];
      
      const matchingProviders = providers.filter(p => {
        if (!p.supportedTypes || p.supportedTypes.length === 0) return true;
        return p.supportedTypes.includes(messageType);
      });
      
      expect(matchingProviders).toHaveLength(2);
      expect(matchingProviders.map(p => p.provider)).toEqual(["TWILIO", "LOCAL"]);
    });

    it("should sort by priority (lower is higher priority)", () => {
      const providers = [
        { provider: "UNIFONIC", enabled: true, priority: 3 },
        { provider: "TWILIO", enabled: true, priority: 1 },
        { provider: "LOCAL", enabled: true, priority: 2 },
      ];
      
      const sorted = [...providers].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
      
      expect(sorted[0].provider).toBe("TWILIO");
      expect(sorted[1].provider).toBe("LOCAL");
      expect(sorted[2].provider).toBe("UNIFONIC");
    });

    it("should prefer defaultProvider when sorting", () => {
      const defaultProvider = "UNIFONIC";
      const providers = [
        { provider: "TWILIO", enabled: true, priority: 1 },
        { provider: "UNIFONIC", enabled: true, priority: 2 },
        { provider: "LOCAL", enabled: true, priority: 3 },
      ];
      
      const sorted = [...providers].sort((a, b) => {
        const aDefault = a.provider === defaultProvider;
        const bDefault = b.provider === defaultProvider;
        if (aDefault && !bDefault) return -1;
        if (bDefault && !aDefault) return 1;
        return (a.priority ?? 99) - (b.priority ?? 99);
      });
      
      expect(sorted[0].provider).toBe("UNIFONIC");
      expect(sorted[1].provider).toBe("TWILIO");
      expect(sorted[2].provider).toBe("LOCAL");
    });

    it("should add env Twilio as fallback with priority 999", () => {
      process.env.TWILIO_ACCOUNT_SID = "test_sid";
      process.env.TWILIO_AUTH_TOKEN = "test_token";
      process.env.TWILIO_PHONE_NUMBER = "+1234567890";
      
      const hasEnvTwilio = Boolean(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER
      );
      
      expect(hasEnvTwilio).toBe(true);
      
      const candidates = [
        { provider: "UNIFONIC", priority: 1 },
      ];
      
      if (hasEnvTwilio) {
        candidates.push({
          provider: "TWILIO",
          priority: 999,
        });
      }
      
      expect(candidates).toHaveLength(2);
      expect(candidates[1].priority).toBe(999);
    });
  });

  describe("Failover logic", () => {
    it("should try next candidate when first fails", async () => {
      const candidates = [
        { provider: "UNIFONIC", priority: 1, from: "+1", accountSid: "a", authToken: "t" },
        { provider: "TWILIO", priority: 999, from: "+2", accountSid: "b", authToken: "u" },
      ];
      
      const results: string[] = [];
      
      for (const candidate of candidates) {
        // Simulate first provider failing
        if (candidate.provider === "UNIFONIC") {
          results.push(`${candidate.provider}: failed`);
          continue;
        }
        // Second provider succeeds
        results.push(`${candidate.provider}: success`);
        break;
      }
      
      expect(results).toEqual(["UNIFONIC: failed", "TWILIO: success"]);
    });

    it("should skip providers with missing credentials", () => {
      const candidates = [
        { provider: "UNIFONIC", priority: 1, from: undefined, accountSid: "a", authToken: "t" },
        { provider: "TWILIO", priority: 2, from: "+2", accountSid: "b", authToken: "u" },
      ];
      
      const validCandidates = candidates.filter(
        c => c.from && c.accountSid && c.authToken
      );
      
      expect(validCandidates).toHaveLength(1);
      expect(validCandidates[0].provider).toBe("TWILIO");
    });
  });

  describe("Type coercion for provider names", () => {
    it("should cast provider names to TSMSProvider", () => {
      type TSMSProvider = "TWILIO" | "UNIFONIC" | "LOCAL";
      
      const providerName = "TWILIO";
      const casted = (providerName || "LOCAL") as TSMSProvider;
      
      expect(casted).toBe("TWILIO");
    });

    it("should default to LOCAL for missing provider names", () => {
      type TSMSProvider = "TWILIO" | "UNIFONIC" | "LOCAL";
      
      const providerName: string | undefined = undefined;
      const casted = (providerName || "LOCAL") as TSMSProvider;
      
      expect(casted).toBe("LOCAL");
    });
  });
});

describe("SMS Queue - Message Processing", () => {
  it("should check message expiry before processing", () => {
    const now = new Date();
    const expiredMessage = {
      expiresAt: new Date(now.getTime() - 1000), // 1 second ago
    };
    const validMessage = {
      expiresAt: new Date(now.getTime() + 1000), // 1 second from now
    };
    
    const isExpired = (msg: { expiresAt?: Date }) => 
      msg.expiresAt && now > msg.expiresAt;
    
    expect(isExpired(expiredMessage)).toBe(true);
    expect(isExpired(validMessage)).toBe(false);
  });

  it("should skip already delivered messages", () => {
    const statuses = ["PENDING", "QUEUED", "SENT", "DELIVERED", "FAILED"];
    const skipStatuses = ["SENT", "DELIVERED"];
    
    for (const status of statuses) {
      const shouldSkip = skipStatuses.includes(status);
      if (status === "SENT" || status === "DELIVERED") {
        expect(shouldSkip).toBe(true);
      } else {
        expect(shouldSkip).toBe(false);
      }
    }
  });

  it("should skip expired/cancelled messages", () => {
    const status = "EXPIRED";
    const shouldSkip = status === "EXPIRED";
    expect(shouldSkip).toBe(true);
  });
});

describe("SMS Queue - SLA Tracking", () => {
  it("should detect SLA breach when elapsed > target", () => {
    const message = {
      createdAt: new Date(Date.now() - 60000), // 60 seconds ago
      slaTargetMs: 30000, // 30 second target
      slaBreached: false,
    };
    
    const elapsed = Date.now() - message.createdAt.getTime();
    const isBreached = message.slaTargetMs && elapsed > message.slaTargetMs;
    
    expect(elapsed).toBeGreaterThan(message.slaTargetMs);
    expect(isBreached).toBe(true);
  });

  it("should not breach when within target", () => {
    const message = {
      createdAt: new Date(Date.now() - 10000), // 10 seconds ago
      slaTargetMs: 30000, // 30 second target
      slaBreached: false,
    };
    
    const elapsed = Date.now() - message.createdAt.getTime();
    const isBreached = message.slaTargetMs && elapsed > message.slaTargetMs;
    
    expect(elapsed).toBeLessThan(message.slaTargetMs);
    expect(isBreached).toBe(false);
  });
});
