/**
 * Unit tests for Nexmo/Vonage SMS Provider
 *
 * Tests Nexmo provider configuration, message sending, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NexmoProvider } from "@/lib/sms-providers/nexmo";
import type { SMSResult } from "@/lib/sms-providers/types";

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
  getCircuitBreaker: vi.fn(() => ({
    run: vi.fn((fn: () => Promise<unknown>) => fn()),
    isOpen: vi.fn(() => false),
    getState: vi.fn(() => "closed"),
  })),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("NexmoProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env vars
    delete process.env.NEXMO_API_KEY;
    delete process.env.NEXMO_API_SECRET;
    delete process.env.NEXMO_FROM_NUMBER;
    delete process.env.NEXMO_WEBHOOK_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Configuration", () => {
    it("should read configuration from environment variables", () => {
      process.env.NEXMO_API_KEY = "test-api-key";
      process.env.NEXMO_API_SECRET = "test-api-secret";
      process.env.NEXMO_FROM_NUMBER = "FIXZIT";

      const provider = new NexmoProvider();
      expect(provider.isConfigured()).toBe(true);
      expect(provider.name).toBe("nexmo");
    });

    it("should accept configuration via constructor", () => {
      const provider = new NexmoProvider({
        apiKey: "custom-key",
        apiSecret: "custom-secret",
        from: "CUSTOM",
      });
      expect(provider.isConfigured()).toBe(true);
    });

    it("should report not configured when credentials missing", () => {
      const provider = new NexmoProvider();
      expect(provider.isConfigured()).toBe(false);
    });

    it("should report not configured when from number is missing", () => {
      const provider = new NexmoProvider({
        apiKey: "key",
        apiSecret: "secret",
        // missing 'from'
      });
      expect(provider.isConfigured()).toBe(false);
    });

    it("should have correct provider name", () => {
      const provider = new NexmoProvider();
      expect(provider.name).toBe("nexmo");
    });
  });

  describe("sendSMS", () => {
    it("should return error when not configured", async () => {
      const provider = new NexmoProvider();
      const result = await provider.sendSMS("+966501234567", "Test message");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Nexmo/Vonage not configured");
      expect(result.provider).toBe("nexmo");
    });

    it("should send SMS successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          "message-count": "1",
          messages: [
            {
              to: "966501234567",
              "message-id": "msg-nexmo-123",
              status: "0",
              "remaining-balance": "10.00",
              "message-price": "0.05",
              network: "42001",
            },
          ],
        }),
      });

      const provider = new NexmoProvider({
        apiKey: "test-key",
        apiSecret: "test-secret",
        from: "FIXZIT",
      });

      const result = await provider.sendSMS("+966501234567", "Test message");

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg-nexmo-123");
      expect(result.provider).toBe("nexmo");
      expect(result.to).toBe("+966501234567");
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("should handle Nexmo API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          "message-count": "1",
          messages: [
            {
              to: "966501234567",
              "message-id": "",
              status: "4",
              "error-text": "Invalid credentials",
            },
          ],
        }),
      });

      const provider = new NexmoProvider({
        apiKey: "bad-key",
        apiSecret: "bad-secret",
        from: "FIXZIT",
      });

      const result = await provider.sendSMS("+966501234567", "Test");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid credentials");
      expect(result.provider).toBe("nexmo");
    });

    it("should handle HTTP errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const provider = new NexmoProvider({
        apiKey: "test-key",
        apiSecret: "test-secret",
        from: "FIXZIT",
      });

      const result = await provider.sendSMS("+966501234567", "Test");

      expect(result.success).toBe(false);
      expect(result.error).toContain("500");
    });

    it("should handle empty response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          "message-count": "0",
          messages: [],
        }),
      });

      const provider = new NexmoProvider({
        apiKey: "test-key",
        apiSecret: "test-secret",
        from: "FIXZIT",
      });

      const result = await provider.sendSMS("+966501234567", "Test");

      expect(result.success).toBe(false);
      expect(result.error).toContain("empty response");
    });

    it("should format Saudi numbers correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          "message-count": "1",
          messages: [
            {
              to: "966501234567",
              "message-id": "msg-123",
              status: "0",
              "remaining-balance": "10.00",
              "message-price": "0.05",
              network: "42001",
            },
          ],
        }),
      });

      const provider = new NexmoProvider({
        apiKey: "test-key",
        apiSecret: "test-secret",
        from: "FIXZIT",
      });

      await provider.sendSMS("0501234567", "Test");

      // Check that fetch was called with correct phone number (without +)
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toBe("https://rest.nexmo.com/sms/json");
      expect(fetchCall[1].body).toContain("to=966501234567");
    });

    it("should include webhook URL when configured", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          "message-count": "1",
          messages: [
            {
              to: "966501234567",
              "message-id": "msg-123",
              status: "0",
              "remaining-balance": "10.00",
              "message-price": "0.05",
              network: "42001",
            },
          ],
        }),
      });

      const provider = new NexmoProvider({
        apiKey: "test-key",
        apiSecret: "test-secret",
        from: "FIXZIT",
        webhookUrl: "https://example.com/webhook",
      });

      await provider.sendSMS("+966501234567", "Test");

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].body).toContain("callback=https%3A%2F%2Fexample.com%2Fwebhook");
    });
  });

  describe("sendOTP", () => {
    it("should send OTP message with default expiry", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          "message-count": "1",
          messages: [
            {
              to: "966501234567",
              "message-id": "otp-123",
              status: "0",
              "remaining-balance": "10.00",
              "message-price": "0.05",
              network: "42001",
            },
          ],
        }),
      });

      const provider = new NexmoProvider({
        apiKey: "test-key",
        apiSecret: "test-secret",
        from: "FIXZIT",
      });

      const result = await provider.sendOTP("+966501234567", "123456");

      expect(result.success).toBe(true);
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].body).toContain("123456");
      expect(fetchCall[1].body).toContain("5+minutes");
    });

    it("should include custom expiry in message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          "message-count": "1",
          messages: [
            {
              to: "966501234567",
              "message-id": "otp-123",
              status: "0",
              "remaining-balance": "10.00",
              "message-price": "0.05",
              network: "42001",
            },
          ],
        }),
      });

      const provider = new NexmoProvider({
        apiKey: "test-key",
        apiSecret: "test-secret",
        from: "FIXZIT",
      });

      await provider.sendOTP("+966501234567", "654321", 10);

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].body).toContain("10+minutes");
    });
  });

  describe("sendBulk", () => {
    it("should send to multiple recipients", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            "message-count": "1",
            messages: [{ to: "966501234567", "message-id": "msg-1", status: "0", "remaining-balance": "10", "message-price": "0.05", network: "42001" }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            "message-count": "1",
            messages: [{ to: "966501234568", "message-id": "msg-2", status: "0", "remaining-balance": "10", "message-price": "0.05", network: "42001" }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            "message-count": "1",
            messages: [{ to: "966501234569", "message-id": "msg-3", status: "0", "remaining-balance": "10", "message-price": "0.05", network: "42001" }],
          }),
        });

      const provider = new NexmoProvider({
        apiKey: "test-key",
        apiSecret: "test-secret",
        from: "FIXZIT",
      });

      const result = await provider.sendBulk(
        ["+966501234567", "+966501234568", "+966501234569"],
        "Bulk test message",
      );

      expect(result.sent).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
    });

    it("should handle partial failures", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            "message-count": "1",
            messages: [{ to: "966501234567", "message-id": "msg-1", status: "0", "remaining-balance": "10", "message-price": "0.05", network: "42001" }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            "message-count": "1",
            messages: [{ to: "966501234568", "message-id": "", status: "4", "error-text": "Invalid credentials" }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            "message-count": "1",
            messages: [{ to: "966501234569", "message-id": "msg-3", status: "0", "remaining-balance": "10", "message-price": "0.05", network: "42001" }],
          }),
        });

      const provider = new NexmoProvider({
        apiKey: "test-key",
        apiSecret: "test-secret",
        from: "FIXZIT",
      });

      const result = await provider.sendBulk(
        ["+966501234567", "+966501234568", "+966501234569"],
        "Bulk test message",
      );

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(1);
    });
  });

  describe("getStatus", () => {
    it("should return unknown status with webhook message", async () => {
      const provider = new NexmoProvider({
        apiKey: "test-key",
        apiSecret: "test-secret",
        from: "FIXZIT",
      });

      const result = await provider.getStatus("msg-123");

      expect(result.status).toBe("unknown");
      expect(result.messageId).toBe("msg-123");
      expect(result.error).toContain("webhook");
    });
  });

  describe("testConfiguration", () => {
    it("should return false when not configured", async () => {
      const provider = new NexmoProvider();
      const result = await provider.testConfiguration();

      expect(result).toBe(false);
    });

    it("should return true when API responds OK", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: 10.5 }),
      });

      const provider = new NexmoProvider({
        apiKey: "test-key",
        apiSecret: "test-secret",
        from: "FIXZIT",
      });

      const result = await provider.testConfiguration();

      expect(result).toBe(true);
    });

    it("should return false when API responds with error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const provider = new NexmoProvider({
        apiKey: "bad-key",
        apiSecret: "bad-secret",
        from: "FIXZIT",
      });

      const result = await provider.testConfiguration();

      expect(result).toBe(false);
    });

    it("should return false on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const provider = new NexmoProvider({
        apiKey: "test-key",
        apiSecret: "test-secret",
        from: "FIXZIT",
      });

      const result = await provider.testConfiguration();

      expect(result).toBe(false);
    });
  });
});
