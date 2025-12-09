/**
 * Taqnyat SMS Provider
 *
 * Implements SMS sending via Taqnyat API (taqnyat.sa).
 * Taqnyat is a leading SMS provider in Saudi Arabia, compliant with CITC regulations.
 *
 * API Documentation: https://dev.taqnyat.sa/en/doc/sms/
 *
 * Required environment variables:
 * - TAQNYAT_BEARER_TOKEN: Bearer token from Taqnyat portal
 * - TAQNYAT_SENDER_ID: Approved sender name (e.g., "FIXZIT")
 * - TAQNYAT_WEBHOOK_PHRASE: Phrase to confirm webhook received
 *
 * @module lib/sms-providers/taqnyat
 */

import { logger } from "@/lib/logger";
import { getCircuitBreaker } from "@/lib/resilience";
import { formatSaudiPhoneNumber, isValidSaudiPhone, validateAndFormatPhone } from "./phone-utils";
import type {
  SMSProvider,
  SMSProviderType,
  SMSResult,
  SMSStatusResult,
  SMSDeliveryStatus,
  BulkSMSResult,
  SMSProviderOptions,
} from "./types";

// Circuit breaker for Taqnyat
const taqnyatBreaker = getCircuitBreaker("taqnyat");

// Maximum recipients per request (Taqnyat limit)
const MAX_BULK_RECIPIENTS = 1000;

// Configuration from environment
const TAQNYAT_BEARER_TOKEN = process.env.TAQNYAT_BEARER_TOKEN || "";
const TAQNYAT_SENDER_ID = process.env.TAQNYAT_SENDER_ID || "FIXZIT";
const TAQNYAT_API_URL = process.env.TAQNYAT_API_URL || "https://api.taqnyat.sa";
const TAQNYAT_TIMEOUT_MS = parseInt(process.env.TAQNYAT_TIMEOUT_MS || "10000", 10);
const TAQNYAT_MAX_ATTEMPTS = parseInt(process.env.TAQNYAT_MAX_ATTEMPTS || "3", 10);

const NODE_ENV = process.env.NODE_ENV || "development";
const SMS_DEV_MODE_ENABLED =
  process.env.SMS_DEV_MODE === "true" ||
  (NODE_ENV !== "production" && process.env.SMS_DEV_MODE !== "false");

/**
 * Taqnyat API Response for sending SMS
 */
interface TaqnyatSendResponse {
  statusCode: number;
  messageId?: number;
  cost?: number;
  currency?: string;
  totalCount?: number;
  msgLength?: number;
  accepted?: string;
  rejected?: string;
  message?: string;
}

/**
 * Taqnyat API Response for account balance
 */
interface TaqnyatBalanceResponse {
  statusCode: number;
  accountStatus?: string;
  accountExpiryDate?: string;
  balance?: string;
  currency?: string;
  message?: string;
}

/**
 * Taqnyat API Response for sender names
 */
interface TaqnyatSendersResponse {
  statusCode: number;
  senders?: Array<{
    senderName: string;
    status: string;
    destination: string;
  }>;
  message?: string;
}

/**
 * Format phone number for Taqnyat API
 * Taqnyat requires international format WITHOUT + or 00 prefix
 * Example: 966501234567 (not +966501234567)
 */
function formatPhoneForTaqnyat(phone: string): string {
  // First format to E.164
  const formatted = isValidSaudiPhone(phone)
    ? formatSaudiPhoneNumber(phone)
    : phone.startsWith("+")
      ? phone
      : `+${phone}`;
  
  // Remove + prefix for Taqnyat
  return formatted.replace(/^\+/, "").replace(/^00/, "");
}

/**
 * Taqnyat SMS Provider Implementation
 */
export class TaqnyatProvider implements SMSProvider {
  readonly name: SMSProviderType = "taqnyat";
  private devMode: boolean;
  private timeoutMs: number;
  private maxRetries: number;
  private bearerToken: string;
  private senderId: string;
  private baseUrl: string;

  constructor(options?: SMSProviderOptions & { bearerToken?: string; senderId?: string }) {
    this.devMode = options?.devMode ?? SMS_DEV_MODE_ENABLED;
    this.timeoutMs = options?.timeoutMs ?? TAQNYAT_TIMEOUT_MS;
    this.maxRetries = options?.maxRetries ?? TAQNYAT_MAX_ATTEMPTS;
    this.bearerToken = options?.bearerToken ?? TAQNYAT_BEARER_TOKEN;
    this.senderId = options?.senderId ?? TAQNYAT_SENDER_ID;
    this.baseUrl = TAQNYAT_API_URL;
  }

  /**
   * Check if Taqnyat is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.bearerToken && this.senderId);
  }

  /**
   * Send SMS via Taqnyat API
   */
  async sendSMS(to: string, message: string): Promise<SMSResult> {
    const formattedPhone = formatPhoneForTaqnyat(to);
    const timestamp = new Date();

    // Validate phone number and warn if invalid
    const validation = validateAndFormatPhone(to);
    if (!validation.isValid) {
      logger.warn("[Taqnyat] Phone validation warning", {
        error: validation.error,
        to: formattedPhone.replace(/\d(?=\d{4})/g, "*"),
      });
    }

    // Development mode - simulate sending
    if (this.devMode) {
      const mockId = `MOCK_TQN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      logger.info(
        `[Taqnyat DevMode] SMS would be sent to ${formattedPhone}: ${message.substring(0, 50)}...`,
      );
      return {
        success: true,
        messageId: mockId,
        provider: this.name,
        to: `+${formattedPhone}`,
        timestamp,
      };
    }

    // Production - actually send SMS
    if (!this.isConfigured()) {
      logger.error("[Taqnyat] Provider not configured - missing credentials");
      return {
        success: false,
        error: "Taqnyat not configured - missing TAQNYAT_BEARER_TOKEN or TAQNYAT_SENDER_ID",
        provider: this.name,
        to: `+${formattedPhone}`,
        timestamp,
      };
    }

    try {
      const result = await taqnyatBreaker.run(() => this.callSendAPI(formattedPhone, message));

      return {
        ...result,
        provider: this.name,
        to: `+${formattedPhone}`,
        timestamp,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("[Taqnyat] Failed to send SMS", {
        to: formattedPhone.replace(/\d(?=\d{4})/g, "*"),
        error: errorMessage,
      });
      return {
        success: false,
        error: errorMessage,
        provider: this.name,
        to: `+${formattedPhone}`,
        timestamp,
      };
    }
  }

  /**
   * Call Taqnyat Send SMS API
   */
  private async callSendAPI(
    to: string,
    message: string,
  ): Promise<Pick<SMSResult, "success" | "messageId" | "error" | "rawResponse">> {
    const url = `${this.baseUrl}/v1/messages`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      // Taqnyat accepts both POST body and query params
      // Using POST with JSON body for better handling of message content
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.bearerToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          sender: this.senderId,
          recipients: [to],
          body: message,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data: TaqnyatSendResponse = await response.json();

      // Check for success (statusCode 201)
      if (data.statusCode === 201 && data.messageId) {
        logger.info("[Taqnyat] SMS sent successfully", {
          messageId: data.messageId,
          to: to.replace(/\d(?=\d{4})/g, "*"),
          cost: data.cost,
          currency: data.currency,
        });
        return {
          success: true,
          messageId: String(data.messageId),
          rawResponse: data,
        };
      }

      // Handle error
      const errorMsg = data.message || `Taqnyat API error: ${data.statusCode}`;
      logger.error("[Taqnyat] SMS send failed", {
        to: to.replace(/\d(?=\d{4})/g, "*"),
        error: errorMsg,
        statusCode: data.statusCode,
        rejected: data.rejected,
      });
      return {
        success: false,
        error: errorMsg,
        rawResponse: data,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        return {
          success: false,
          error: `Taqnyat API timeout after ${this.timeoutMs}ms`,
        };
      }
      throw error;
    }
  }

  /**
   * Send an OTP verification code
   */
  async sendOTP(
    to: string,
    code: string,
    expiresInMinutes: number = 5,
  ): Promise<SMSResult> {
    const message = `Your Fixzit verification code is: ${code}. Valid for ${expiresInMinutes} minutes. Do not share this code.`;
    return this.sendSMS(to, message);
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulk(recipients: string[], message: string): Promise<BulkSMSResult> {
    // Enforce maximum recipients limit
    if (recipients.length > MAX_BULK_RECIPIENTS) {
      logger.error("[Taqnyat] Bulk SMS exceeds maximum recipients", {
        requested: recipients.length,
        max: MAX_BULK_RECIPIENTS,
      });
      return {
        total: recipients.length,
        successful: 0,
        sent: 0,
        failed: recipients.length,
        results: [{
          success: false,
          error: `Bulk SMS exceeds maximum of ${MAX_BULK_RECIPIENTS} recipients`,
          provider: this.name,
          timestamp: new Date(),
        }],
      };
    }

    // In dev mode or production, Taqnyat supports bulk sending in a single request
    if (this.devMode) {
      const results: SMSResult[] = [];
      for (const recipient of recipients) {
        const result = await this.sendSMS(recipient, message);
        results.push(result);
      }
      return {
        total: recipients.length,
        successful: results.filter(r => r.success).length,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      };
    }

    // Production: Use Taqnyat's bulk API (single request)
    if (!this.isConfigured()) {
      return {
        total: recipients.length,
        successful: 0,
        sent: 0,
        failed: recipients.length,
        results: [{
          success: false,
          error: "Taqnyat not configured",
          provider: this.name,
          timestamp: new Date(),
        }],
      };
    }

    try {
      const formattedRecipients = recipients.map(formatPhoneForTaqnyat);
      const url = `${this.baseUrl}/v1/messages`;

      const response = await taqnyatBreaker.run(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${this.bearerToken}`,
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: JSON.stringify({
              sender: this.senderId,
              recipients: formattedRecipients,
              body: message,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          return res;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      });

      const data: TaqnyatSendResponse = await response.json();

      if (data.statusCode === 201) {
        // Parse accepted/rejected from response
        const accepted = data.accepted ? JSON.parse(data.accepted.replace(/'/g, '"')) : [];
        const rejected = data.rejected ? JSON.parse(data.rejected.replace(/'/g, '"')) : [];

        const successCount = accepted.length;
        const failCount = rejected.length;

        logger.info("[Taqnyat] Bulk SMS sent", {
          total: recipients.length,
          accepted: successCount,
          rejected: failCount,
          messageId: data.messageId,
          cost: data.cost,
        });

        return {
          total: recipients.length,
          successful: successCount,
          sent: successCount,
          failed: failCount,
          results: [{
            success: true,
            messageId: String(data.messageId),
            provider: this.name,
            timestamp: new Date(),
            rawResponse: data,
          }],
        };
      }

      return {
        total: recipients.length,
        successful: 0,
        sent: 0,
        failed: recipients.length,
        results: [{
          success: false,
          error: data.message || `Taqnyat API error: ${data.statusCode}`,
          provider: this.name,
          timestamp: new Date(),
          rawResponse: data,
        }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        total: recipients.length,
        successful: 0,
        sent: 0,
        failed: recipients.length,
        results: [{
          success: false,
          error: errorMessage,
          provider: this.name,
          timestamp: new Date(),
        }],
      };
    }
  }

  /**
   * Get delivery status of a message
   * Note: Taqnyat provides delivery status via webhook, not polling API
   */
  async getStatus(messageId: string): Promise<SMSStatusResult | null> {
    if (this.devMode) {
      return {
        status: "delivered",
        messageId,
        updatedAt: new Date(),
        createdAt: new Date(),
        sentAt: new Date(),
      };
    }

    // Taqnyat uses webhooks for delivery status
    return {
      status: "unknown" as SMSDeliveryStatus,
      messageId,
      error: "Taqnyat uses webhook for delivery status - check /api/webhooks/taqnyat/sms",
    };
  }

  /**
   * Test the Taqnyat configuration by checking account balance
   */
  async testConfiguration(): Promise<boolean> {
    if (this.devMode) {
      return true;
    }

    if (!this.isConfigured()) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/account/balance`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.bearerToken}`,
          "Accept": "application/json",
        },
      });

      const data: TaqnyatBalanceResponse = await response.json();
      
      if (data.statusCode === 200 && data.accountStatus === "active") {
        logger.info("[Taqnyat] Configuration valid", {
          balance: data.balance,
          currency: data.currency,
          expiryDate: data.accountExpiryDate,
        });
        return true;
      }

      logger.warn("[Taqnyat] Configuration check failed", {
        statusCode: data.statusCode,
        message: data.message,
      });
      return false;
    } catch (error) {
      logger.error("[Taqnyat] Configuration test failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<{ balance: number; currency: string } | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/account/balance`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.bearerToken}`,
          "Accept": "application/json",
        },
      });

      const data: TaqnyatBalanceResponse = await response.json();
      
      if (data.statusCode === 200 && data.balance) {
        return {
          balance: parseFloat(data.balance),
          currency: data.currency || "SAR",
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get list of sender names
   */
  async getSenders(): Promise<Array<{ name: string; status: string; destination: string }> | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/messages/senders`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.bearerToken}`,
          "Accept": "application/json",
        },
      });

      const data: TaqnyatSendersResponse = await response.json();
      
      if (data.statusCode === 201 && data.senders) {
        return data.senders.map(s => ({
          name: s.senderName,
          status: s.status,
          destination: s.destination,
        }));
      }

      return null;
    } catch {
      return null;
    }
  }
}

// Singleton instance for convenience
let defaultProvider: TaqnyatProvider | null = null;

export function getTaqnyatProvider(
  options?: SMSProviderOptions & { bearerToken?: string; senderId?: string },
): TaqnyatProvider {
  if (options) {
    return new TaqnyatProvider(options);
  }
  if (!defaultProvider) {
    defaultProvider = new TaqnyatProvider();
  }
  return defaultProvider;
}

/**
 * Check if Taqnyat is configured
 */
export function isTaqnyatConfigured(): boolean {
  return Boolean(TAQNYAT_BEARER_TOKEN && TAQNYAT_SENDER_ID);
}

export default TaqnyatProvider;
