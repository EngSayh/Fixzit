/**
 * Unit tests for SMS Provider Factory
 *
 * Tests provider creation, detection, and MockProvider behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createSMSProvider,
  getSMSProvider,
  resetSMSProvider,
  getConfiguredProviderType,
  getProvidersInfo,
} from "@/lib/sms-providers";

// Mock logger to prevent actual logging during tests
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("SMS Provider Factory", () => {
  beforeEach(() => {
    // Reset provider singleton before each test
    resetSMSProvider();
    // Clear any env overrides
    vi.stubEnv("SMS_PROVIDER", "");
    vi.stubEnv("SMS_DEV_MODE", "true");
    vi.stubEnv("UNIFONIC_APP_SID", "");
    vi.stubEnv("TWILIO_ACCOUNT_SID", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("createSMSProvider", () => {
    it("should create mock provider when explicitly requested", () => {
      const provider = createSMSProvider("mock");
      expect(provider.name).toBe("mock");
      expect(provider.isConfigured()).toBe(true);
    });

    it("should create mock provider when no provider is configured", () => {
      const provider = createSMSProvider();
      expect(provider.name).toBe("mock");
    });
  });

  describe("getSMSProvider (singleton)", () => {
    it("should return the same instance on subsequent calls", () => {
      const provider1 = getSMSProvider();
      const provider2 = getSMSProvider();
      expect(provider1).toBe(provider2);
    });

    it("should return new instance after reset", () => {
      const provider1 = getSMSProvider();
      resetSMSProvider();
      const provider2 = getSMSProvider();
      // They should be different object instances
      expect(provider1).not.toBe(provider2);
    });
  });

  describe("getProvidersInfo", () => {
    it("should return info for all providers", () => {
      const info = getProvidersInfo();

      // Only Taqnyat and Mock providers are available
      // Unifonic, Twilio, AWS SNS, and Nexmo have been removed
      expect(info.taqnyat).toBeDefined();
      expect(info.mock).toBeDefined();

      expect(info.taqnyat.recommended).toBe(true);
      expect(info.taqnyat.notes).toContain("CITC-compliant");
      expect(info.mock.configured).toBe(true);
    });
  });
});

describe("MockProvider", () => {
  let mockProvider: ReturnType<typeof createSMSProvider>;

  beforeEach(() => {
    resetSMSProvider();
    mockProvider = createSMSProvider("mock");
  });

  describe("sendSMS", () => {
    it("should return success with mock message ID", async () => {
      const result = await mockProvider.sendSMS("+966501234567", "Test message");

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^MOCK_\d+_/);
      expect(result.provider).toBe("mock");
      expect(result.to).toBe("+966501234567");
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("should always succeed regardless of phone format", async () => {
      // MockProvider doesn't validate - it's for dev/testing
      const result = await mockProvider.sendSMS("invalid-phone", "Test");
      expect(result.success).toBe(true);
    });
  });

  describe("sendOTP", () => {
    it("should send OTP message", async () => {
      const result = await mockProvider.sendOTP?.("+966501234567", "123456", 5);

      expect(result?.success).toBe(true);
      expect(result?.messageId).toMatch(/^MOCK_/);
    });
  });

  describe("sendBulk", () => {
    it("should send to multiple recipients", async () => {
      const recipients = ["+966501111111", "+966502222222", "+966503333333"];
      const result = await mockProvider.sendBulk?.(recipients, "Bulk message");

      expect(result?.total).toBe(3);
      expect(result?.successful).toBe(3);
      expect(result?.sent).toBe(3);
      expect(result?.failed).toBe(0);
      expect(result?.results).toHaveLength(3);
    });
  });

  describe("getStatus", () => {
    it("should return delivered status for any message ID", async () => {
      const result = await mockProvider.getStatus?.("MOCK_12345");

      expect(result?.status).toBe("delivered");
      expect(result?.messageId).toBe("MOCK_12345");
    });
  });

  describe("testConfiguration", () => {
    it("should always return true for mock provider", async () => {
      const result = await mockProvider.testConfiguration?.();
      expect(result).toBe(true);
    });
  });
});
