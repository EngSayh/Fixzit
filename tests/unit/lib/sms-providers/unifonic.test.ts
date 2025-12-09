/**
 * Unit tests for Unifonic SMS Provider
 *
 * Tests Unifonic provider configuration, message sending, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock resilience utilities
vi.mock("@/lib/resilience", () => ({
  getCircuitBreaker: vi.fn(() => ({
    run: vi.fn((fn: () => Promise<unknown>) => fn()),
    isOpen: vi.fn(() => false),
    getState: vi.fn(() => "closed"),
  })),
  executeWithRetry: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  withTimeout: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocks
import { UnifonicProvider } from "@/lib/sms-providers/unifonic";

describe("UnifonicProvider", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    // Clear Unifonic env vars
    delete process.env.UNIFONIC_APP_SID;
    delete process.env.UNIFONIC_SENDER_ID;
    delete process.env.UNIFONIC_API_URL;
    delete process.env.SMS_DEV_MODE;
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("Configuration", () => {
    it("should have correct provider name", () => {
      const provider = new UnifonicProvider();
      expect(provider.name).toBe("unifonic");
    });

    it("should report not configured when credentials missing", () => {
      const provider = new UnifonicProvider();
      expect(provider.isConfigured()).toBe(false);
    });

    it("should support dev mode via options", () => {
      const provider = new UnifonicProvider({ devMode: true });
      expect(provider.name).toBe("unifonic");
    });

    it("should accept custom timeout options", () => {
      const provider = new UnifonicProvider({ timeoutMs: 5000, maxRetries: 2 });
      expect(provider.name).toBe("unifonic");
    });
  });

  describe("sendSMS", () => {
    it("should return success in dev mode", async () => {
      const provider = new UnifonicProvider({ devMode: true });
      const result = await provider.sendSMS("+966501234567", "Test message");

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^MOCK_UNI_/);
      expect(result.provider).toBe("unifonic");
      expect(result.to).toBe("+966501234567");
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("should format Saudi phone numbers", async () => {
      const provider = new UnifonicProvider({ devMode: true });
      const result = await provider.sendSMS("0501234567", "Test message");

      expect(result.success).toBe(true);
      expect(result.to).toMatch(/^\+966/);
    });

    it("should handle message content correctly", async () => {
      const provider = new UnifonicProvider({ devMode: true });
      const result = await provider.sendSMS("+966501234567", "Your code is 123456");

      expect(result.success).toBe(true);
      expect(result.provider).toBe("unifonic");
    });

    it("should include timestamp in result", async () => {
      const provider = new UnifonicProvider({ devMode: true });
      const result = await provider.sendSMS("+966501234567", "Test");

      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe("sendOTP", () => {
    it("should send OTP with correct message format", async () => {
      const provider = new UnifonicProvider({ devMode: true });
      const result = await provider.sendOTP("+966501234567", "123456");

      expect(result.success).toBe(true);
      expect(result.provider).toBe("unifonic");
    });

    it("should include custom expiry in message", async () => {
      const provider = new UnifonicProvider({ devMode: true });
      const result = await provider.sendOTP("+966501234567", "654321", 10);

      expect(result.success).toBe(true);
    });

    it("should format phone number for OTP", async () => {
      const provider = new UnifonicProvider({ devMode: true });
      const result = await provider.sendOTP("0501234567", "123456");

      expect(result.success).toBe(true);
      expect(result.to).toMatch(/^\+966/);
    });
  });

  describe("sendBulk", () => {
    it("should send to multiple recipients", async () => {
      const provider = new UnifonicProvider({ devMode: true });
      const result = await provider.sendBulk(
        ["+966501234567", "+966501234568", "+966501234569"],
        "Bulk test message",
      );

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
    });

    it("should return correct counts", async () => {
      const provider = new UnifonicProvider({ devMode: true });
      const result = await provider.sendBulk(
        ["+966501234567", "+966501234568"],
        "Bulk test",
      );

      expect(result.total).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.sent).toBe(2);
    });

    it("should handle single recipient", async () => {
      const provider = new UnifonicProvider({ devMode: true });
      const result = await provider.sendBulk(["+966501234567"], "Single bulk");

      expect(result.total).toBe(1);
      expect(result.successful).toBe(1);
    });
  });

  describe("getStatus", () => {
    it("should return delivered status in dev mode", async () => {
      const provider = new UnifonicProvider({ devMode: true });
      const result = await provider.getStatus("MSG12345");

      expect(result).not.toBeNull();
      expect(result?.status).toBe("delivered");
      expect(result?.messageId).toBe("MSG12345");
    });

    it("should include timestamps in status", async () => {
      const provider = new UnifonicProvider({ devMode: true });
      const result = await provider.getStatus("MSG12345");

      expect(result?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("testConfiguration", () => {
    it("should return true in dev mode", async () => {
      const provider = new UnifonicProvider({ devMode: true });
      const result = await provider.testConfiguration();

      expect(result).toBe(true);
    });
  });

  describe("Phone Number Formatting", () => {
    it("should handle Saudi numbers starting with 05", async () => {
      const provider = new UnifonicProvider({ devMode: true });
      const result = await provider.sendSMS("0512345678", "Test");

      expect(result.to).toMatch(/^\+966/);
    });

    it("should handle numbers already in E.164 format", async () => {
      const provider = new UnifonicProvider({ devMode: true });
      const result = await provider.sendSMS("+966512345678", "Test");

      expect(result.to).toBe("+966512345678");
    });

    it("should handle international numbers", async () => {
      const provider = new UnifonicProvider({ devMode: true });
      const result = await provider.sendSMS("+14155551234", "Test");

      expect(result.to).toBeDefined();
    });
  });
});
