/**
 * Taqnyat SMS Provider Unit Tests
 *
 * Comprehensive tests for the Taqnyat SMS provider implementation.
 * Tests cover: configuration, sendSMS, sendOTP, sendBulk, getStatus, and testConfiguration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TaqnyatProvider, getTaqnyatProvider, isTaqnyatConfigured } from "@/lib/sms-providers/taqnyat";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock circuit breaker
vi.mock("@/lib/resilience", () => ({
  getCircuitBreaker: () => ({
    run: async <T>(fn: () => Promise<T>) => fn(),
  }),
}));

// Mock phone-utils
vi.mock("@/lib/sms-providers/phone-utils", () => ({
  formatSaudiPhoneNumber: (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("966")) return `+${cleaned}`;
    if (cleaned.startsWith("05") || cleaned.startsWith("5")) {
      return `+966${cleaned.replace(/^0/, "")}`;
    }
    return `+${cleaned}`;
  },
  isValidSaudiPhone: (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.startsWith("966") || cleaned.startsWith("05") || cleaned.startsWith("5");
  },
  validateAndFormatPhone: (phone: string) => ({
    isValid: true,
    formattedPhone: phone,
  }),
}));

describe("TaqnyatProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    // Set up mock environment
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SMS_DEV_MODE", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("constructor", () => {
    it("should create provider with default options", () => {
      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
        devMode: true,
      });
      expect(provider.name).toBe("taqnyat");
    });

    it("should use custom options when provided", () => {
      const provider = new TaqnyatProvider({
        bearerToken: "custom-token",
        senderId: "CustomSender",
        devMode: true,
        timeoutMs: 5000,
        maxRetries: 2,
      });
      expect(provider.name).toBe("taqnyat");
    });
  });

  describe("isConfigured", () => {
    it("should return true when token and sender are set", () => {
      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
      });
      expect(provider.isConfigured()).toBe(true);
    });

    it("should return false when token is missing", () => {
      const provider = new TaqnyatProvider({
        bearerToken: "",
        senderId: "TestSender",
      });
      expect(provider.isConfigured()).toBe(false);
    });

    it("should return false when sender is missing", () => {
      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "",
      });
      expect(provider.isConfigured()).toBe(false);
    });
  });

  describe("sendSMS", () => {
    it("should return mock result in dev mode", async () => {
      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
        devMode: true,
      });

      const result = await provider.sendSMS("+966501234567", "Test message");

      expect(result.success).toBe(true);
      expect(result.messageId).toContain("MOCK_TQN_");
      expect(result.provider).toBe("taqnyat");
      expect(result.to).toBe("+966501234567");
    });

    it("should send SMS successfully in production", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          statusCode: 201,
          messageId: 12345,
          cost: 0.05,
          currency: "SAR",
          accepted: "['966501234567']",
          rejected: "[]",
        }),
      });

      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
        devMode: false,
      });

      const result = await provider.sendSMS("+966501234567", "Test message");

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("12345");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.taqnyat.sa/v1/messages",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            sender: "TestSender",
            recipients: ["966501234567"],
            body: "Test message",
          }),
        }),
      );
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          statusCode: 400,
          message: "Invalid recipient number",
        }),
      });

      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
        devMode: false,
      });

      const result = await provider.sendSMS("+966501234567", "Test message");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid recipient number");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
        devMode: false,
      });

      const result = await provider.sendSMS("+966501234567", "Test message");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("should return error when not configured", async () => {
      const provider = new TaqnyatProvider({
        bearerToken: "",
        senderId: "",
        devMode: false,
      });

      const result = await provider.sendSMS("+966501234567", "Test message");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });

    it("should format Saudi phone numbers correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          statusCode: 201,
          messageId: 12345,
        }),
      });

      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
        devMode: false,
      });

      await provider.sendSMS("0501234567", "Test message");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("966501234567"),
        }),
      );
    });
  });

  describe("sendOTP", () => {
    it("should send OTP with formatted message", async () => {
      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
        devMode: true,
      });

      const result = await provider.sendOTP("+966501234567", "123456", 5);

      expect(result.success).toBe(true);
      expect(result.messageId).toContain("MOCK_TQN_");
    });

    it("should use default expiry time", async () => {
      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
        devMode: true,
      });

      const result = await provider.sendOTP("+966501234567", "123456");

      expect(result.success).toBe(true);
    });
  });

  describe("sendBulk", () => {
    it("should reject when exceeding maximum recipients", async () => {
      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
        devMode: false,
      });

      const recipients = Array(1001).fill("+966501234567");
      const result = await provider.sendBulk(recipients, "Test message");

      expect(result.failed).toBe(1001);
      expect(result.successful).toBe(0);
      expect(result.results[0].error).toContain("exceeds maximum");
    });

    it("should send bulk SMS in dev mode", async () => {
      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
        devMode: true,
      });

      const recipients = ["+966501234567", "+966501234568"];
      const result = await provider.sendBulk(recipients, "Test message");

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });

    it("should send bulk SMS in production", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          statusCode: 201,
          messageId: 12345,
          cost: 0.10,
          accepted: "['966501234567', '966501234568']",
          rejected: "[]",
        }),
      });

      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
        devMode: false,
      });

      const recipients = ["+966501234567", "+966501234568"];
      const result = await provider.sendBulk(recipients, "Test message");

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.results[0].messageId).toBe("12345");
    });

    it("should handle partial rejections", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          statusCode: 201,
          messageId: 12345,
          accepted: "['966501234567']",
          rejected: "['invalid']",
        }),
      });

      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
        devMode: false,
      });

      const recipients = ["+966501234567", "invalid"];
      const result = await provider.sendBulk(recipients, "Test message");

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
    });

    it("should return error when not configured", async () => {
      const provider = new TaqnyatProvider({
        bearerToken: "",
        senderId: "",
        devMode: false,
      });

      const result = await provider.sendBulk(["+966501234567"], "Test");

      expect(result.failed).toBe(1);
      expect(result.results[0].error).toContain("not configured");
    });
  });

  describe("getStatus", () => {
    it("should return delivered status in dev mode", async () => {
      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
        devMode: true,
      });

      const result = await provider.getStatus("12345");

      expect(result?.status).toBe("delivered");
      expect(result?.messageId).toBe("12345");
    });

    it("should return unknown status with webhook note in production", async () => {
      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
        devMode: false,
      });

      const result = await provider.getStatus("12345");

      expect(result?.error).toContain("webhook");
    });
  });

  describe("testConfiguration", () => {
    it("should return true in dev mode", async () => {
      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
        devMode: true,
      });

      const result = await provider.testConfiguration();

      expect(result).toBe(true);
    });

    it("should return false when not configured", async () => {
      const provider = new TaqnyatProvider({
        bearerToken: "",
        senderId: "",
        devMode: false,
      });

      const result = await provider.testConfiguration();

      expect(result).toBe(false);
    });

    it("should return true when balance check succeeds", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          statusCode: 200,
          accountStatus: "active",
          balance: "100.50",
          currency: "SAR",
        }),
      });

      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
        devMode: false,
      });

      const result = await provider.testConfiguration();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.taqnyat.sa/account/balance",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );
    });

    it("should return false when account is inactive", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          statusCode: 401,
          message: "Unauthorized",
        }),
      });

      const provider = new TaqnyatProvider({
        bearerToken: "invalid-token",
        senderId: "TestSender",
        devMode: false,
      });

      const result = await provider.testConfiguration();

      expect(result).toBe(false);
    });
  });

  describe("getBalance", () => {
    it("should return null when not configured", async () => {
      const provider = new TaqnyatProvider({
        bearerToken: "",
        senderId: "",
      });

      const result = await provider.getBalance();

      expect(result).toBeNull();
    });

    it("should return balance when API succeeds", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          statusCode: 200,
          balance: "150.75",
          currency: "SAR",
        }),
      });

      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
      });

      const result = await provider.getBalance();

      expect(result).toEqual({
        balance: 150.75,
        currency: "SAR",
      });
    });

    it("should return null on API error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
      });

      const result = await provider.getBalance();

      expect(result).toBeNull();
    });
  });

  describe("getSenders", () => {
    it("should return null when not configured", async () => {
      const provider = new TaqnyatProvider({
        bearerToken: "",
        senderId: "",
      });

      const result = await provider.getSenders();

      expect(result).toBeNull();
    });

    it("should return sender list when API succeeds", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          statusCode: 201,
          senders: [
            { senderName: "FIXZIT", status: "active", destination: "local" },
            { senderName: "TestSender", status: "active", destination: "international" },
          ],
        }),
      });

      const provider = new TaqnyatProvider({
        bearerToken: "test-token",
        senderId: "TestSender",
      });

      const result = await provider.getSenders();

      expect(result).toHaveLength(2);
      expect(result?.[0]).toEqual({
        name: "FIXZIT",
        status: "active",
        destination: "local",
      });
    });
  });
});

describe("getTaqnyatProvider", () => {
  it("should return singleton instance without options", () => {
    const provider1 = getTaqnyatProvider();
    const provider2 = getTaqnyatProvider();

    expect(provider1).toBe(provider2);
  });

  it("should return new instance with options", () => {
    const provider1 = getTaqnyatProvider({ devMode: true });
    const provider2 = getTaqnyatProvider({ devMode: false });

    expect(provider1).not.toBe(provider2);
  });
});

describe("isTaqnyatConfigured", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return false when env vars are not set", () => {
    // Default state - no env vars
    expect(isTaqnyatConfigured()).toBe(false);
  });
});
