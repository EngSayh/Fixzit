/**
 * Nexmo/Vonage SMS Provider
 *
 * Implements SMS sending via Vonage (formerly Nexmo) API.
 * Supports Saudi Arabia and international phone numbers.
 *
 * Required environment variables:
 * - NEXMO_API_KEY: Vonage API key
 * - NEXMO_API_SECRET: Vonage API secret
 * - NEXMO_FROM_NUMBER: Sender phone number or name (max 11 chars for alphanumeric)
 *
 * @module lib/sms-providers/nexmo
 */

import { logger } from "@/lib/logger";
import { getCircuitBreaker } from "@/lib/resilience";

// Circuit breaker for Nexmo
const nexmoBreaker = getCircuitBreaker("nexmo");
import { formatSaudiPhoneNumber, isValidSaudiPhone } from "./phone-utils";
import type {
  SMSProvider,
  SMSProviderType,
  SMSResult,
  SMSStatusResult,
  SMSDeliveryStatus,
} from "./types";

export interface NexmoConfig {
  apiKey: string;
  apiSecret: string;
  from: string;
  webhookUrl?: string;
}

interface NexmoSMSResponse {
  "message-count": string;
  messages: Array<{
    to: string;
    "message-id": string;
    status: string;
    "remaining-balance": string;
    "message-price": string;
    network: string;
    "error-text"?: string;
  }>;
}

// Nexmo status codes
const NEXMO_STATUS_CODES: Record<string, string> = {
  "0": "Success",
  "1": "Throttled",
  "2": "Missing params",
  "3": "Invalid params",
  "4": "Invalid credentials",
  "5": "Internal error",
  "6": "Invalid message",
  "7": "Number barred",
  "8": "Partner account barred",
  "9": "Partner quota exceeded",
  "10": "Account not enabled for REST",
  "11": "Message too long",
  "12": "Communication failed",
  "13": "Invalid signature",
  "14": "Invalid sender address",
  "15": "Invalid TTL",
  "16": "Facility not allowed",
  "17": "Invalid message class",
  "19": "Facility not allowed",
  "20": "Invalid recipient",
  "29": "Non white-listed destination",
};

export class NexmoProvider implements SMSProvider {
  readonly name: SMSProviderType = "nexmo";
  private config: NexmoConfig;
  private baseUrl = "https://rest.nexmo.com";

  constructor(config?: Partial<NexmoConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.NEXMO_API_KEY || "",
      apiSecret: config?.apiSecret || process.env.NEXMO_API_SECRET || "",
      from: config?.from || process.env.NEXMO_FROM_NUMBER || "",
      webhookUrl: config?.webhookUrl || process.env.NEXMO_WEBHOOK_URL,
    };
  }

  /**
   * Check if Nexmo is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.apiSecret && this.config.from);
  }

  /**
   * Send SMS via Nexmo/Vonage
   */
  async sendSMS(to: string, message: string): Promise<SMSResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "Nexmo/Vonage not configured",
        provider: this.name,
      };
    }

    // Format phone number (remove + for Nexmo)
    let formattedPhone = isValidSaudiPhone(to)
      ? formatSaudiPhoneNumber(to)
      : to.startsWith("+")
        ? to
        : `+${to}`;
    
    // Nexmo prefers numbers without + prefix
    formattedPhone = formattedPhone.replace(/^\+/, "");

    try {
      const params = new URLSearchParams({
        api_key: this.config.apiKey,
        api_secret: this.config.apiSecret,
        from: this.config.from,
        to: formattedPhone,
        text: message,
        type: "unicode", // Support Arabic and other unicode characters
      });

      // Add callback URL if configured
      if (this.config.webhookUrl) {
        params.append("callback", this.config.webhookUrl);
      }

      const response = await nexmoBreaker.run(async () => fetch(`${this.baseUrl}/sms/json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }));

      if (!response.ok) {
        throw new Error(`Nexmo API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as NexmoSMSResponse;
      const firstMessage = data.messages?.[0];

      if (!firstMessage) {
        throw new Error("Nexmo returned empty response");
      }

      if (firstMessage.status !== "0") {
        const errorText = firstMessage["error-text"] || NEXMO_STATUS_CODES[firstMessage.status] || "Unknown error";
        logger.warn("[Nexmo] SMS send failed", {
          status: firstMessage.status,
          error: errorText,
          to: formattedPhone.replace(/\d(?=\d{4})/g, "*"),
        });
        return {
          success: false,
          error: errorText,
          provider: this.name,
        };
      }

      logger.info("[Nexmo] SMS sent successfully", {
        messageId: firstMessage["message-id"],
        to: formattedPhone.replace(/\d(?=\d{4})/g, "*"),
        cost: firstMessage["message-price"],
        network: firstMessage.network,
      });

      return {
        success: true,
        messageId: firstMessage["message-id"],
        provider: this.name,
        to: `+${formattedPhone}`,
        timestamp: new Date(),
        rawResponse: data,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("[Nexmo] Failed to send SMS", {
        error: errorMessage,
        to: formattedPhone.replace(/\d(?=\d{4})/g, "*"),
      });

      return {
        success: false,
        error: errorMessage,
        provider: this.name,
      };
    }
  }

  /**
   * Get SMS delivery status
   * Note: Nexmo provides delivery receipts via webhook, not polling API
   */
  async getStatus(_messageId: string): Promise<SMSStatusResult> {
    // Nexmo/Vonage uses delivery receipts via webhook
    // Status updates come via /api/webhooks/nexmo/sms
    return {
      status: "unknown" as SMSDeliveryStatus,
      messageId: _messageId,
      error: "Nexmo uses webhook for delivery status - check /api/webhooks/nexmo/sms",
    };
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulk(
    recipients: string[],
    message: string
  ): Promise<{ success: boolean; sent: number; failed: number; results: SMSResult[] }> {
    const results: SMSResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const result = await this.sendSMS(recipient, message);
      results.push(result);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return {
      success: failed === 0,
      sent,
      failed,
      results,
    };
  }

  /**
   * Test the Nexmo configuration
   */
  async testConfiguration(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      // Check account balance to verify credentials
      const params = new URLSearchParams({
        api_key: this.config.apiKey,
        api_secret: this.config.apiSecret,
      });

      const response = await fetch(
        `${this.baseUrl}/account/get-balance?${params.toString()}`,
      );

      return response.ok;
    } catch {
      return false;
    }
  }
}

// Singleton instance for convenience
let defaultProvider: NexmoProvider | null = null;

export function getNexmoProvider(
  config?: Partial<NexmoConfig>,
): NexmoProvider {
  if (config) {
    return new NexmoProvider(config);
  }
  if (!defaultProvider) {
    defaultProvider = new NexmoProvider();
  }
  return defaultProvider;
}

export default NexmoProvider;
