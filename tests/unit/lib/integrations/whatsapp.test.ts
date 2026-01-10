/**
 * @fileoverview Tests for WhatsApp Business API Integration
 * @module tests/lib/integrations/whatsapp.test
 * 
 * @implements FEAT-INTEG-001 - WhatsApp Business Integration Tests
 * @created 2026-01-10
 * @status IMPLEMENTED [AGENT-0032]
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isWhatsAppEnabled,
  normalizePhoneNumber,
  sendWhatsAppTextMessage,
  sendWhatsAppTemplateMessage,
  sendWhatsAppOTP,
  sendWorkOrderNotification,
  WhatsAppTemplates,
} from "@/lib/integrations/whatsapp";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("WhatsApp Business API Integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Clear environment
    delete process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("isWhatsAppEnabled", () => {
    it("should return false when no credentials configured", () => {
      expect(isWhatsAppEnabled()).toBe(false);
    });

    it("should return false when partial credentials configured", () => {
      process.env.WHATSAPP_PHONE_NUMBER_ID = "123456";
      expect(isWhatsAppEnabled()).toBe(false);
    });

    it("should return true when all credentials configured", () => {
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = "business123";
      process.env.WHATSAPP_PHONE_NUMBER_ID = "phone123";
      process.env.WHATSAPP_ACCESS_TOKEN = "token123";
      expect(isWhatsAppEnabled()).toBe(true);
    });
  });

  describe("normalizePhoneNumber", () => {
    it("should normalize phone starting with 0 to Saudi format", () => {
      expect(normalizePhoneNumber("0501234567")).toBe("966501234567");
    });

    it("should keep already normalized phone unchanged", () => {
      expect(normalizePhoneNumber("966501234567")).toBe("966501234567");
    });

    it("should handle phone with + prefix", () => {
      expect(normalizePhoneNumber("+966501234567")).toBe("966501234567");
    });

    it("should remove non-digit characters", () => {
      expect(normalizePhoneNumber("+966 50 123 4567")).toBe("966501234567");
    });

    it("should handle 9-digit phone numbers", () => {
      expect(normalizePhoneNumber("501234567")).toBe("966501234567");
    });

    it("should handle phone with dashes", () => {
      expect(normalizePhoneNumber("050-123-4567")).toBe("966501234567");
    });
  });

  describe("sendWhatsAppTextMessage", () => {
    it("should return error when WhatsApp not configured", async () => {
      const result = await sendWhatsAppTextMessage({
        to: "0501234567",
        message: "Hello",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("WhatsApp not configured");
    });

    it("should send text message successfully", async () => {
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = "business123";
      process.env.WHATSAPP_PHONE_NUMBER_ID = "phone123";
      process.env.WHATSAPP_ACCESS_TOKEN = "token123";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: "msg_123" }],
        }),
      });

      const result = await sendWhatsAppTextMessage({
        to: "0501234567",
        message: "Hello from Fixzit!",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg_123");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/phone123/messages"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer token123",
          }),
        })
      );
    });

    it("should handle API error response", async () => {
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = "business123";
      process.env.WHATSAPP_PHONE_NUMBER_ID = "phone123";
      process.env.WHATSAPP_ACCESS_TOKEN = "token123";

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: "Invalid phone number" },
        }),
      });

      const result = await sendWhatsAppTextMessage({
        to: "invalid",
        message: "Hello",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid phone number");
    });

    it("should handle network errors", async () => {
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = "business123";
      process.env.WHATSAPP_PHONE_NUMBER_ID = "phone123";
      process.env.WHATSAPP_ACCESS_TOKEN = "token123";

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await sendWhatsAppTextMessage({
        to: "0501234567",
        message: "Hello",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  describe("sendWhatsAppTemplateMessage", () => {
    it("should return error when WhatsApp not configured", async () => {
      const result = await sendWhatsAppTemplateMessage({
        to: "0501234567",
        templateName: "test_template",
        languageCode: "en",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("WhatsApp not configured");
    });

    it("should send template message successfully", async () => {
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = "business123";
      process.env.WHATSAPP_PHONE_NUMBER_ID = "phone123";
      process.env.WHATSAPP_ACCESS_TOKEN = "token123";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: "tmpl_456" }],
        }),
      });

      const result = await sendWhatsAppTemplateMessage({
        to: "0501234567",
        templateName: "order_confirmation",
        languageCode: "ar",
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: "Order #12345" }],
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("tmpl_456");
    });
  });

  describe("sendWhatsAppOTP", () => {
    it("should send OTP template with correct parameters", async () => {
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = "business123";
      process.env.WHATSAPP_PHONE_NUMBER_ID = "phone123";
      process.env.WHATSAPP_ACCESS_TOKEN = "token123";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: "otp_789" }],
        }),
      });

      const result = await sendWhatsAppOTP("0501234567", "123456", 10);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("otp_verification"),
        })
      );
    });
  });

  describe("sendWorkOrderNotification", () => {
    it("should send work order notification in Arabic", async () => {
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = "business123";
      process.env.WHATSAPP_PHONE_NUMBER_ID = "phone123";
      process.env.WHATSAPP_ACCESS_TOKEN = "token123";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: "wo_101" }],
        }),
      });

      const result = await sendWorkOrderNotification(
        "0501234567",
        "WO-2026-001",
        "Building A",
        "Ahmed"
      );

      expect(result.success).toBe(true);
      // Verify Arabic language code used
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.template.language.code).toBe("ar");
    });
  });

  describe("WhatsAppTemplates", () => {
    it("should have all required template names", () => {
      expect(WhatsAppTemplates.ORDER_CONFIRMATION).toBe("order_confirmation");
      expect(WhatsAppTemplates.ORDER_SHIPPED).toBe("order_shipped");
      expect(WhatsAppTemplates.ORDER_DELIVERED).toBe("order_delivered");
      expect(WhatsAppTemplates.PAYMENT_RECEIVED).toBe("payment_received");
      expect(WhatsAppTemplates.PAYMENT_REMINDER).toBe("payment_reminder");
      expect(WhatsAppTemplates.WO_CREATED).toBe("workorder_created");
      expect(WhatsAppTemplates.WO_ASSIGNED).toBe("workorder_assigned");
      expect(WhatsAppTemplates.WO_COMPLETED).toBe("workorder_completed");
      expect(WhatsAppTemplates.OTP_VERIFICATION).toBe("otp_verification");
      expect(WhatsAppTemplates.WELCOME_MESSAGE).toBe("welcome_message");
      expect(WhatsAppTemplates.APPOINTMENT_REMINDER).toBe("appointment_reminder");
    });
  });
});
