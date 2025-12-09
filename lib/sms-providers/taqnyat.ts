/**
 * Taqnyat SMS Provider
 *
 * CITC-compliant SMS provider for Saudi Arabia.
 * This is the ONLY production SMS provider for Fixzit.
 *
 * API Reference: https://api.taqnyat.sa/
 * - Base URL: https://api.taqnyat.sa/
 * - Auth: Bearer Token
 * - Max recipients per bulk: 1000
 * - Phone format: International without 00 or + (e.g., 966500000000)
 *
 * Environment Variables:
 * - TAQNYAT_BEARER_TOKEN: API authentication token
 * - TAQNYAT_SENDER_NAME: Registered sender ID (default: "Fixzit")
 */

import { logger } from "@/lib/logger";
import type {
  SMSProvider,
  SMSProviderType,
  SMSProviderOptions,
  SMSResult,
  SMSStatusResult,
  BulkSMSResult,
} from "./types";

// Taqnyat API configuration
const TAQNYAT_BASE_URL = "https://api.taqnyat.sa";
const TAQNYAT_BEARER_TOKEN = process.env.TAQNYAT_BEARER_TOKEN;
const TAQNYAT_SENDER_NAME = process.env.TAQNYAT_SENDER_NAME || "Fixzit";
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_BULK_RECIPIENTS = 1000;

/**
 * Check if Taqnyat is properly configured
 */
export function isTaqnyatConfigured(): boolean {
  return Boolean(TAQNYAT_BEARER_TOKEN && TAQNYAT_SENDER_NAME);
}

/**
 * Normalize phone number to Taqnyat format (international without 00 or +)
 * e.g., +966500000000 -> 966500000000
 */
function normalizePhoneNumber(phone: string): string {
  let normalized = phone.trim();

  // Remove common prefixes
  if (normalized.startsWith("+")) {
    normalized = normalized.substring(1);
  }
  if (normalized.startsWith("00")) {
    normalized = normalized.substring(2);
  }

  // Remove spaces and dashes
  normalized = normalized.replace(/[\s-]/g, "");

  // If starts with 0 and looks like Saudi number, add 966
  if (normalized.startsWith("05") && normalized.length === 10) {
    normalized = "966" + normalized.substring(1);
  }

  return normalized;
}

/**
 * Taqnyat API response types
 */
interface TaqnyatSendResponse {
  statusCode: number;
  messageId?: string;
  message?: string;
  cost?: number;
  currency?: string;
  totalCount?: number;
  msgCount?: number;
  dateCreated?: string;
}

interface TaqnyatBalanceResponse {
  statusCode: number;
  balance?: number;
  currency?: string;
  message?: string;
}

interface TaqnyatSendersResponse {
  statusCode: number;
  senders?: Array<{
    name: string;
    status: string;
  }>;
  message?: string;
}

/**
 * Taqnyat SMS Provider Implementation
 */
export class TaqnyatProvider implements SMSProvider {
  readonly name: SMSProviderType = "taqnyat";
  private readonly bearerToken: string;
  private readonly senderName: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(options?: SMSProviderOptions) {
    this.bearerToken = TAQNYAT_BEARER_TOKEN || "";
    this.senderName = TAQNYAT_SENDER_NAME;
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options?.maxRetries ?? 2;
  }

  isConfigured(): boolean {
    return isTaqnyatConfigured();
  }

  /**
   * Make authenticated API request to Taqnyat
   */
  private async apiRequest<T>(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${TAQNYAT_BASE_URL}${endpoint}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const data = (await response.json()) as T;

      if (!response.ok) {
        logger.error("[Taqnyat] API error", {
          endpoint,
          status: response.status,
          data,
        });
        throw new Error(`Taqnyat API error: ${response.status}`);
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Send a single SMS message
   */
  async sendSMS(to: string, message: string): Promise<SMSResult> {
    if (!this.isConfigured()) {
      logger.warn("[Taqnyat] Provider not configured");
      return {
        success: false,
        error: "Taqnyat provider not configured",
        provider: this.name,
        to,
        timestamp: new Date(),
      };
    }

    const recipient = normalizePhoneNumber(to);

    try {
      const response = await this.apiRequest<TaqnyatSendResponse>(
        "/v1/messages",
        "POST",
        {
          recipients: [recipient],
          body: message,
          sender: this.senderName,
        },
      );

      if (response.statusCode === 1 || response.statusCode === 200) {
        logger.info("[Taqnyat] SMS sent successfully", {
          to: recipient,
          messageId: response.messageId,
          cost: response.cost,
        });

        return {
          success: true,
          messageId: response.messageId,
          provider: this.name,
          to: recipient,
          timestamp: new Date(),
          rawResponse: response,
        };
      }

      logger.error("[Taqnyat] SMS failed", { response });
      return {
        success: false,
        error: response.message || "Unknown error",
        provider: this.name,
        to: recipient,
        timestamp: new Date(),
        rawResponse: response,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("[Taqnyat] SMS error", { error: errorMessage, to: recipient });

      return {
        success: false,
        error: errorMessage,
        provider: this.name,
        to: recipient,
        timestamp: new Date(),
      };
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
    const message = `رمز التحقق الخاص بك هو: ${code}. صالح لمدة ${expiresInMinutes} دقائق.\nYour verification code is: ${code}. Valid for ${expiresInMinutes} minutes.`;
    return this.sendSMS(to, message);
  }

  /**
   * Send bulk SMS messages (max 1000 recipients per request)
   */
  async sendBulk(recipients: string[], message: string): Promise<BulkSMSResult> {
    if (!this.isConfigured()) {
      return {
        total: recipients.length,
        successful: 0,
        sent: 0,
        failed: recipients.length,
        results: recipients.map((to) => ({
          success: false,
          error: "Taqnyat provider not configured",
          provider: this.name,
          to,
          timestamp: new Date(),
        })),
      };
    }

    // Normalize all phone numbers
    const normalizedRecipients = recipients.map(normalizePhoneNumber);

    // Split into batches of MAX_BULK_RECIPIENTS
    const batches: string[][] = [];
    for (let i = 0; i < normalizedRecipients.length; i += MAX_BULK_RECIPIENTS) {
      batches.push(normalizedRecipients.slice(i, i + MAX_BULK_RECIPIENTS));
    }

    const allResults: SMSResult[] = [];
    let totalSuccessful = 0;
    let totalFailed = 0;

    for (const batch of batches) {
      try {
        const response = await this.apiRequest<TaqnyatSendResponse>(
          "/v1/messages",
          "POST",
          {
            recipients: batch,
            body: message,
            sender: this.senderName,
          },
        );

        if (response.statusCode === 1 || response.statusCode === 200) {
          totalSuccessful += batch.length;
          batch.forEach((to) => {
            allResults.push({
              success: true,
              messageId: response.messageId,
              provider: this.name,
              to,
              timestamp: new Date(),
            });
          });
        } else {
          totalFailed += batch.length;
          batch.forEach((to) => {
            allResults.push({
              success: false,
              error: response.message || "Bulk send failed",
              provider: this.name,
              to,
              timestamp: new Date(),
            });
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        totalFailed += batch.length;
        batch.forEach((to) => {
          allResults.push({
            success: false,
            error: errorMessage,
            provider: this.name,
            to,
            timestamp: new Date(),
          });
        });
      }
    }

    return {
      total: recipients.length,
      successful: totalSuccessful,
      sent: totalSuccessful,
      failed: totalFailed,
      results: allResults,
    };
  }

  /**
   * Get message delivery status (not supported by Taqnyat basic API)
   */
  async getStatus(messageId: string): Promise<SMSStatusResult | null> {
    // Taqnyat uses webhooks for delivery reports
    // For now, return unknown status
    return {
      status: "unknown",
      messageId,
      updatedAt: new Date(),
    };
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<{ balance: number; currency: string } | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const response = await this.apiRequest<TaqnyatBalanceResponse>(
        "/account/balance",
        "GET",
      );

      if (response.statusCode === 1 || response.statusCode === 200) {
        return {
          balance: response.balance ?? 0,
          currency: response.currency ?? "SAR",
        };
      }

      logger.error("[Taqnyat] Failed to get balance", { response });
      return null;
    } catch (error) {
      logger.error("[Taqnyat] Balance check error", { error });
      return null;
    }
  }

  /**
   * Get registered senders
   */
  async getSenders(): Promise<Array<{ name: string; status: string }> | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const response = await this.apiRequest<TaqnyatSendersResponse>(
        "/v1/messages/senders",
        "GET",
      );

      if (response.statusCode === 1 || response.statusCode === 200) {
        return response.senders ?? [];
      }

      return null;
    } catch (error) {
      logger.error("[Taqnyat] Senders fetch error", { error });
      return null;
    }
  }

  /**
   * Test provider configuration
   */
  async testConfiguration(): Promise<boolean> {
    try {
      const balance = await this.getBalance();
      return balance !== null;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let taqnyatInstance: TaqnyatProvider | null = null;

/**
 * Get the Taqnyat provider singleton instance
 */
export function getTaqnyatProvider(options?: SMSProviderOptions): TaqnyatProvider {
  if (!taqnyatInstance) {
    taqnyatInstance = new TaqnyatProvider(options);
  }
  return taqnyatInstance;
}
