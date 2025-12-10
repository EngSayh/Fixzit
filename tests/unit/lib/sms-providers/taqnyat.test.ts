/**
 * Taqnyat SMS Provider Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TaqnyatProvider } from "@/lib/sms-providers/taqnyat";

describe("TaqnyatProvider", () => {
  // Store original env
  const originalEnv = { ...process.env };
  
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();
    // Set up environment variables for tests
    process.env.TAQNYAT_BEARER_TOKEN = "test-bearer-token";
    process.env.TAQNYAT_SENDER_NAME = "FIXZIT";
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should use environment variables when no config provided", () => {
      const provider = new TaqnyatProvider();
      expect(provider.isConfigured()).toBe(true);
    });

    it("should use provided config over environment variables", () => {
      const provider = new TaqnyatProvider({
        bearerToken: "custom-token",
        senderName: "CUSTOM",
      });
      expect(provider.isConfigured()).toBe(true);
    });

    it("should return false for isConfigured when missing credentials", () => {
      delete process.env.TAQNYAT_BEARER_TOKEN;
      delete process.env.TAQNYAT_SENDER_NAME;
      const provider = new TaqnyatProvider();
      expect(provider.isConfigured()).toBe(false);
    });
  });

  describe("sendSMS", () => {
    it("should return error when not configured", async () => {
      delete process.env.TAQNYAT_BEARER_TOKEN;
      delete process.env.TAQNYAT_SENDER_NAME;
      const provider = new TaqnyatProvider();
      
      const result = await provider.sendSMS("966500000000", "Test message");
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });

    it("should send SMS successfully with mocked fetch", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: 201,
          messageId: "MSG123456",
          message: "Message sent successfully",
        }),
      });
      global.fetch = mockFetch;

      const provider = new TaqnyatProvider();
      const result = await provider.sendSMS("966500000000", "Test message");

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("MSG123456");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/messages"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-bearer-token",
          }),
        })
      );
    });

    it("should handle API errors", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          statusCode: 400,
          message: "Invalid phone number",
        }),
      });
      global.fetch = mockFetch;

      const provider = new TaqnyatProvider();
      const result = await provider.sendSMS("invalid", "Test message");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle network errors", async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));
      global.fetch = mockFetch;

      const provider = new TaqnyatProvider();
      const result = await provider.sendSMS("966500000000", "Test message");

      expect(result.success).toBe(false);
      // Error message is sanitized for security - doesn't expose internal details
      expect(result.error).toContain("Taqnyat SMS send failed");
    });
  });

  describe("sendOTP", () => {
    it("should send OTP with correct message format", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: 201,
          messageId: "OTP123456",
        }),
      });
      global.fetch = mockFetch;

      const provider = new TaqnyatProvider();
      const result = await provider.sendOTP("966500000000", "123456", 5);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("123456"),
        })
      );
    });
  });

  describe("sendBulk", () => {
    it("should send bulk SMS to multiple recipients", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: 201,
          messageId: "BULK123456",
          message: "Messages sent",
        }),
      });
      global.fetch = mockFetch;

      const provider = new TaqnyatProvider();
      const recipients = ["966500000001", "966500000002", "966500000003"];
      const result = await provider.sendBulk(recipients, "Bulk test message");

      expect(result.sent).toBeGreaterThan(0);
      expect(result.results).toHaveLength(recipients.length);
    });

    it("should handle bulk send failure", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          message: "Bulk send failed",
        }),
      });
      global.fetch = mockFetch;

      const provider = new TaqnyatProvider();
      const result = await provider.sendBulk(
        ["966500000001", "966500000002"],
        "Test"
      );

      expect(result.failed).toBe(2);
      expect(result.sent).toBe(0);
    });
  });

  describe("testConfiguration", () => {
    it("should return true when configuration is valid", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: 200,
          balance: 100,
        }),
      });
      global.fetch = mockFetch;

      const provider = new TaqnyatProvider();
      const result = await provider.testConfiguration();

      expect(result).toBe(true);
    });

    it("should return false when not configured", async () => {
      delete process.env.TAQNYAT_BEARER_TOKEN;
      delete process.env.TAQNYAT_SENDER_NAME;
      
      const provider = new TaqnyatProvider();
      const result = await provider.testConfiguration();

      expect(result).toBe(false);
    });

    it("should return false when API returns error", async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error("API Error"));
      global.fetch = mockFetch;

      const provider = new TaqnyatProvider();
      const result = await provider.testConfiguration();

      expect(result).toBe(false);
    });
  });

  describe("getStatus", () => {
    it("should return message status", async () => {
      const provider = new TaqnyatProvider();
      const status = await provider.getStatus("MSG123456");

      expect(status).not.toBeNull();
      expect(status?.status).toBe("sent");
      expect(status?.messageId).toBe("MSG123456");
    });
  });

  describe("getBalance", () => {
    it("should return balance when configured", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          statusCode: 200,
          balance: 150.50,
        }),
      });
      global.fetch = mockFetch;

      const provider = new TaqnyatProvider();
      const balance = await provider.getBalance();

      expect(balance).toBe(150.50);
    });

    it("should throw error when not configured", async () => {
      delete process.env.TAQNYAT_BEARER_TOKEN;
      delete process.env.TAQNYAT_SENDER_NAME;
      const provider = new TaqnyatProvider();
      
      await expect(provider.getBalance()).rejects.toThrow("not configured");
    });
  });
});
