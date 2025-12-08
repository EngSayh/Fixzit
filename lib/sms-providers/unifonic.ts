/**
 * Unifonic SMS Provider
 *
 * Unifonic is a leading CPaaS provider in Saudi Arabia and MENA region.
 * This provider is recommended for KSA operations where Twilio has limited support.
 *
 * API Documentation: https://docs.unifonic.com
 * Console: https://console.unifonic.com
 */

import { logger } from "@/lib/logger";
import {
  executeWithRetry,
  withTimeout,
  getCircuitBreaker,
} from "@/lib/resilience";
import type {
  SMSProvider,
  SMSProviderType,
  SMSResult,
  SMSStatusResult,
  SMSDeliveryStatus,
  BulkSMSResult,
  SMSProviderOptions,
} from "./types";
import { formatSaudiPhoneNumber } from "./phone-utils";

// Configuration from environment
const UNIFONIC_APP_SID = process.env.UNIFONIC_APP_SID || "";
const UNIFONIC_SENDER_ID = process.env.UNIFONIC_SENDER_ID || "FIXZIT";
const UNIFONIC_API_URL =
  process.env.UNIFONIC_API_URL || "https://el.cloud.unifonic.com/rest";
const UNIFONIC_TIMEOUT_MS = parseInt(
  process.env.UNIFONIC_TIMEOUT_MS || "10000",
  10,
);
const UNIFONIC_MAX_ATTEMPTS = parseInt(
  process.env.UNIFONIC_MAX_ATTEMPTS || "3",
  10,
);
const UNIFONIC_RETRY_DELAY_MS = parseInt(
  process.env.UNIFONIC_RETRY_DELAY_MS || "500",
  10,
);

const NODE_ENV = process.env.NODE_ENV || "development";
const SMS_DEV_MODE_ENABLED =
  process.env.SMS_DEV_MODE === "true" ||
  (NODE_ENV !== "production" && process.env.SMS_DEV_MODE !== "false");

// Circuit breaker for Unifonic API
const unifonicBreaker = getCircuitBreaker("unifonic");

/**
 * Unifonic API Response for sending SMS
 */
interface UnifonicSendResponse {
  success: boolean;
  message?: string;
  errorCode?: string;
  data?: {
    MessageID?: string;
    Status?: string;
    NumberOfUnits?: number;
    Cost?: number;
    Balance?: number;
    Recipient?: string;
    TimeCreated?: string;
  };
}

/**
 * Unifonic API Response for message status
 */
interface UnifonicStatusResponse {
  success: boolean;
  message?: string;
  errorCode?: string;
  data?: {
    MessageID?: string;
    Status?: string;
    Recipient?: string;
    TimeCreated?: string;
    TimeSent?: string;
    ErrorCode?: string;
  };
}

/**
 * Map Unifonic status to our standard status
 */
function mapUnifonicStatus(status?: string): SMSDeliveryStatus {
  if (!status) return "unknown";
  const normalized = status.toLowerCase();
  switch (normalized) {
    case "queued":
    case "accepted":
      return "queued";
    case "sending":
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "failed":
    case "rejected":
    case "expired":
      return "failed";
    case "undelivered":
    case "undeliverable":
      return "undelivered";
    default:
      return "unknown";
  }
}

/**
 * Unifonic SMS Provider Implementation
 */
export class UnifonicProvider implements SMSProvider {
  readonly name: SMSProviderType = "unifonic";
  private devMode: boolean;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(options?: SMSProviderOptions) {
    this.devMode = options?.devMode ?? SMS_DEV_MODE_ENABLED;
    this.timeoutMs = options?.timeoutMs ?? UNIFONIC_TIMEOUT_MS;
    this.maxRetries = options?.maxRetries ?? UNIFONIC_MAX_ATTEMPTS;
  }

  /**
   * Check if Unifonic is configured
   */
  isConfigured(): boolean {
    return Boolean(UNIFONIC_APP_SID && UNIFONIC_SENDER_ID);
  }

  /**
   * Send a single SMS message via Unifonic API
   */
  async sendSMS(to: string, message: string): Promise<SMSResult> {
    const formattedPhone = formatSaudiPhoneNumber(to);
    const timestamp = new Date();

    // Development mode - simulate sending
    if (this.devMode) {
      const mockSid = `MOCK_UNI_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      logger.info(
        `[Unifonic DevMode] SMS would be sent to ${formattedPhone}: ${message.substring(0, 50)}...`,
      );
      return {
        success: true,
        messageId: mockSid,
        provider: this.name,
        to: formattedPhone,
        timestamp,
      };
    }

    // Production - actually send SMS
    if (!this.isConfigured()) {
      logger.error("[Unifonic] Provider not configured - missing credentials");
      return {
        success: false,
        error: "Unifonic not configured - missing UNIFONIC_APP_SID",
        provider: this.name,
        to: formattedPhone,
        timestamp,
      };
    }

    try {
      const result = await executeWithRetry(
        () =>
          unifonicBreaker.run(() =>
            withTimeout(() => this.callSendAPI(formattedPhone, message), {
              timeoutMs: this.timeoutMs,
            }),
          ),
        {
          maxAttempts: this.maxRetries,
          baseDelayMs: UNIFONIC_RETRY_DELAY_MS,
          label: "unifonic-send",
        },
      );

      return {
        ...result,
        provider: this.name,
        to: formattedPhone,
        timestamp,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("[Unifonic] Failed to send SMS", {
        to: formattedPhone,
        error: errorMessage,
      });
      return {
        success: false,
        error: errorMessage,
        provider: this.name,
        to: formattedPhone,
        timestamp,
      };
    }
  }

  /**
   * Call Unifonic Send SMS API
   */
  private async callSendAPI(
    to: string,
    message: string,
  ): Promise<Pick<SMSResult, "success" | "messageId" | "error" | "rawResponse">> {
    const url = `${UNIFONIC_API_URL}/SMS/messages`;

    // Unifonic API uses form-encoded data
    const formData = new URLSearchParams();
    formData.append("AppSid", UNIFONIC_APP_SID);
    formData.append("Recipient", to.replace("+", "")); // Unifonic wants number without +
    formData.append("Body", message);
    formData.append("SenderID", UNIFONIC_SENDER_ID);

    logger.debug("[Unifonic] Sending SMS", { to, url });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data: UnifonicSendResponse = await response.json();

    if (data.success && data.data?.MessageID) {
      logger.info("[Unifonic] SMS sent successfully", {
        messageId: data.data.MessageID,
        to,
        status: data.data.Status,
      });
      return {
        success: true,
        messageId: data.data.MessageID,
        rawResponse: data,
      };
    }

    // Handle error
    const errorMsg = data.message || data.errorCode || "Unknown Unifonic error";
    logger.error("[Unifonic] SMS send failed", {
      to,
      error: errorMsg,
      errorCode: data.errorCode,
    });
    return {
      success: false,
      error: errorMsg,
      rawResponse: data,
    };
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
    const results: SMSResult[] = [];
    let successful = 0;
    let failed = 0;

    // Send sequentially to avoid rate limiting (O(n) with entries())
    for (const [index, recipient] of recipients.entries()) {
      const result = await this.sendSMS(recipient, message);
      results.push(result);
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
      // Small delay between sends to respect rate limits
      if (index < recipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return {
      total: recipients.length,
      successful,
      sent: successful, // Alias for backward compatibility
      failed,
      results,
    };
  }

  /**
   * Get delivery status of a message
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

    if (!this.isConfigured()) {
      return null;
    }

    try {
      const url = `${UNIFONIC_API_URL}/SMS/messages/status`;
      const formData = new URLSearchParams();
      formData.append("AppSid", UNIFONIC_APP_SID);
      formData.append("MessageID", messageId);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data: UnifonicStatusResponse = await response.json();

      if (data.success && data.data) {
        return {
          status: mapUnifonicStatus(data.data.Status),
          messageId: data.data.MessageID,
          updatedAt: new Date(),
          createdAt: data.data.TimeCreated
            ? new Date(data.data.TimeCreated)
            : undefined,
          sentAt: data.data.TimeSent
            ? new Date(data.data.TimeSent)
            : undefined,
          errorCode: data.data.ErrorCode,
        };
      }

      return null;
    } catch (error) {
      logger.error("[Unifonic] Failed to get message status", {
        messageId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  /**
   * Test if configuration is valid
   */
  async testConfiguration(): Promise<boolean> {
    if (this.devMode) {
      return true;
    }

    if (!this.isConfigured()) {
      return false;
    }

    // Could call a lightweight API endpoint to verify credentials
    // For now, just verify credentials exist
    return true;
  }
}

/**
 * Create a new Unifonic provider instance
 */
export function createUnifonicProvider(
  options?: SMSProviderOptions,
): UnifonicProvider {
  return new UnifonicProvider(options);
}
