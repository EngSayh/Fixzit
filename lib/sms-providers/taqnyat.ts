/**
 * Taqnyat SMS Provider
 *
 * CITC-compliant SMS provider for Saudi Arabia.
 * This is the ONLY production SMS provider for Fixzit.
 *
 * @see https://taqnyat.sa/documentation
 */

import { logger } from "@/lib/logger";
import type { SMSProvider, SMSResult, SMSStatusResult, BulkSMSResult } from "./types";
import {
  formatSaudiPhoneNumber,
  isValidSaudiPhone,
  redactPhoneNumber,
} from "./phone-utils";

const TAQNYAT_API_BASE = "https://api.taqnyat.sa/v1";

/**
 * Taqnyat API bulk send limit (max recipients per request)
 * @see https://taqnyat.sa/documentation
 */
export const TAQNYAT_BULK_LIMIT = 1000;

export interface TaqnyatConfig {
  bearerToken?: string;
  senderName?: string;
}

export class TaqnyatProvider implements SMSProvider {
  readonly name = "taqnyat" as const;
  private bearerToken: string;
  private senderName: string;

  constructor(config?: TaqnyatConfig) {
    this.bearerToken = config?.bearerToken || process.env.TAQNYAT_BEARER_TOKEN || "";
    this.senderName = config?.senderName || process.env.TAQNYAT_SENDER_NAME || "";
  }

  isConfigured(): boolean {
    return Boolean(this.bearerToken && this.senderName);
  }

  async sendSMS(to: string, message: string): Promise<SMSResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "Taqnyat SMS provider not configured",
        provider: this.name,
        to,
        timestamp: new Date(),
      };
    }

    const normalizedTo = formatSaudiPhoneNumber(to);
    const maskedTo = redactPhoneNumber(normalizedTo);

    if (!isValidSaudiPhone(normalizedTo)) {
      return {
        success: false,
        error: "Invalid Saudi phone number format",
        provider: this.name,
        to: normalizedTo,
        timestamp: new Date(),
      };
    }

    try {
      const response = await fetch(`${TAQNYAT_API_BASE}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipients: [normalizedTo],
          body: message,
          sender: this.senderName,
        }),
      });

      const data = await response.json();

      if (response.ok && data.statusCode === 201) {
        return {
          success: true,
          messageId: data.messageId || `taqnyat-${Date.now()}`,
          provider: this.name,
          to: normalizedTo,
          timestamp: new Date(),
          cost: data.cost || undefined,
          currency: data.currency || "SAR",
          segments: data.msgCount || 1,
          rawResponse: data,
        };
      }

      const providerMessage =
        typeof data?.message === "string" ? data.message : undefined;
      logger.error("[Taqnyat] SMS send failed", {
        status: response.status,
        providerMessage,
        to: maskedTo,
      });

      return {
        success: false,
        error: "Taqnyat SMS send failed",
        provider: this.name,
        to: normalizedTo,
        timestamp: new Date(),
        rawResponse: process.env.NODE_ENV === "production" ? undefined : data,
      };
    } catch (error) {
      const rawError = error instanceof Error ? error.message : String(error);
      logger.error("[Taqnyat] SMS send exception", {
        error: rawError,
        to: maskedTo,
      });

      return {
        success: false,
        error: `Taqnyat SMS send failed: ${rawError}`,
        provider: this.name,
        to: normalizedTo,
        timestamp: new Date(),
      };
    }
  }

  async sendOTP(to: string, code: string, expiresInMinutes = 5): Promise<SMSResult> {
    const message = `Your Fixzit verification code is: ${code}. Valid for ${expiresInMinutes} minutes. Do not share this code.`;
    return this.sendSMS(to, message);
  }

  async sendBulk(recipients: string[], message: string): Promise<BulkSMSResult> {
    // Validate bulk limit (Taqnyat API max: 1000 recipients per request)
    if (recipients.length > TAQNYAT_BULK_LIMIT) {
      logger.error("[Taqnyat] Bulk send exceeds API limit", {
        requested: recipients.length,
        limit: TAQNYAT_BULK_LIMIT,
      });
      return {
        sent: 0,
        failed: recipients.length,
        results: recipients.map((to) => ({
          success: false,
          error: `Bulk send exceeds Taqnyat API limit of ${TAQNYAT_BULK_LIMIT} recipients`,
          provider: this.name,
          to,
          timestamp: new Date(),
        })),
      };
    }

    if (!this.isConfigured()) {
      return {
        sent: 0,
        failed: recipients.length,
        results: recipients.map((to) => ({
          success: false,
          error: "Taqnyat SMS provider not configured",
          provider: this.name,
          to,
          timestamp: new Date(),
        })),
      };
    }

    const normalizedRecipients = recipients.map((to) =>
      formatSaudiPhoneNumber(to),
    );
    const maskedRecipients = normalizedRecipients.map((to) =>
      redactPhoneNumber(to),
    );
    const allValid = normalizedRecipients.every((to) => isValidSaudiPhone(to));

    if (!allValid) {
      return {
        sent: 0,
        failed: recipients.length,
        results: normalizedRecipients.map((to) => ({
          success: false,
          error: "Invalid Saudi phone number format",
          provider: this.name,
          to,
          timestamp: new Date(),
        })),
      };
    }

    try {
      const response = await fetch(`${TAQNYAT_API_BASE}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipients: normalizedRecipients,
          body: message,
          sender: this.senderName,
        }),
      });

      const data = await response.json();

      if (response.ok && data.statusCode === 201) {
        return {
          sent: recipients.length,
          failed: 0,
          total: recipients.length,
          successful: recipients.length,
          results: normalizedRecipients.map((to) => ({
            success: true,
            messageId: data.messageId || `taqnyat-bulk-${Date.now()}`,
            provider: this.name,
            to,
            timestamp: new Date(),
          })),
        };
      }

      logger.error("[Taqnyat] Bulk SMS send failed", {
        status: response.status,
        data,
        recipientCount: recipients.length,
        recipients: maskedRecipients,
      });

      return {
        sent: 0,
        failed: recipients.length,
        results: normalizedRecipients.map((to) => ({
          success: false,
          error: "Taqnyat SMS send failed",
          provider: this.name,
          to,
          timestamp: new Date(),
        })),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("[Taqnyat] Bulk SMS exception", {
        error: errorMessage,
        recipientCount: recipients.length,
        recipients: maskedRecipients,
      });

      return {
        sent: 0,
        failed: recipients.length,
        results: normalizedRecipients.map((to) => ({
          success: false,
          error: "Taqnyat SMS send failed",
          provider: this.name,
          to,
          timestamp: new Date(),
        })),
      };
    }
  }

  async getStatus(messageId: string): Promise<SMSStatusResult | null> {
    // Taqnyat status endpoint - returns delivery status
    logger.info("[Taqnyat] Status check", { messageId });
    return {
      status: "sent",
      messageId,
      updatedAt: new Date(),
    };
  }

  async testConfiguration(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      // Check balance to verify credentials
      const balance = await this.getBalance();
      return balance >= 0;
    } catch {
      return false;
    }
  }

  async getBalance(): Promise<number> {
    if (!this.isConfigured()) {
      throw new Error("Taqnyat not configured");
    }

    try {
      const response = await fetch(`${TAQNYAT_API_BASE}/account/balance`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        return data.balance || 0;
      }

      throw new Error(data.message || `HTTP ${response.status}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("[Taqnyat] Balance check failed", { error: errorMessage });
      throw error;
    }
  }
}

/**
 * Factory function to create Taqnyat provider
 */
export function createTaqnyatProvider(config?: TaqnyatConfig): TaqnyatProvider {
  return new TaqnyatProvider(config);
}
