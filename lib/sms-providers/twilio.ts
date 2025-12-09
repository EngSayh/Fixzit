/**
 * Twilio SMS Provider
 *
 * Wraps the existing Twilio functionality as an SMSProvider implementation.
 * Note: Twilio has limited support in Saudi Arabia - consider Unifonic for KSA.
 */

import { logger } from "@/lib/logger";
import {
  executeWithRetry,
  withTimeout,
  getCircuitBreaker,
} from "@/lib/resilience";
import { SERVICE_RESILIENCE } from "@/config/service-timeouts";
import type {
  SMSProvider,
  SMSProviderType,
  SMSResult,
  SMSStatusResult,
  SMSDeliveryStatus,
  BulkSMSResult,
  SMSProviderOptions,
} from "./types";
import { formatSaudiPhoneNumber, validateAndFormatPhone } from "./phone-utils";

// Maximum recipients for bulk SMS to prevent rate limit exhaustion
const MAX_BULK_RECIPIENTS = 1000;

// Lazy import Twilio to avoid loading if not used
let twilioClient: ReturnType<typeof import("twilio")> | null = null;

async function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (accountSid && authToken) {
      const twilio = (await import("twilio")).default;
      twilioClient = twilio(accountSid, authToken);
    }
  }
  return twilioClient;
}

// Configuration from environment
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";

const NODE_ENV = process.env.NODE_ENV || "development";
const SMS_DEV_MODE_ENABLED =
  process.env.SMS_DEV_MODE === "true" ||
  (NODE_ENV !== "production" && process.env.SMS_DEV_MODE !== "false");

// Resilience configuration
const twilioBreaker = getCircuitBreaker("twilio");
const twilioResilience = SERVICE_RESILIENCE.twilio;

/**
 * Map Twilio status to our standard status
 */
function mapTwilioStatus(status?: string): SMSDeliveryStatus {
  if (!status) return "unknown";
  const normalized = status.toLowerCase();
  switch (normalized) {
    case "queued":
    case "accepted":
      return "queued";
    case "sending":
      return "sending";
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "failed":
    case "canceled":
      return "failed";
    case "undelivered":
      return "undelivered";
    default:
      return "unknown";
  }
}

/**
 * Twilio SMS Provider Implementation
 */
export class TwilioProvider implements SMSProvider {
  readonly name: SMSProviderType = "twilio";
  private devMode: boolean;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(options?: SMSProviderOptions) {
    this.devMode = options?.devMode ?? SMS_DEV_MODE_ENABLED;
    this.timeoutMs =
      options?.timeoutMs ?? twilioResilience.timeouts.smsSendMs;
    this.maxRetries =
      options?.maxRetries ?? twilioResilience.retries.maxAttempts;
  }

  /**
   * Check if Twilio is configured
   */
  isConfigured(): boolean {
    return Boolean(
      TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER,
    );
  }

  /**
   * Send a single SMS message via Twilio API
   */
  async sendSMS(to: string, message: string): Promise<SMSResult> {
    const formattedPhone = formatSaudiPhoneNumber(to);
    const timestamp = new Date();

    // Validate phone number and warn if invalid
    const validation = validateAndFormatPhone(to);
    if (!validation.isValid) {
      logger.warn("[Twilio] Phone validation warning", {
        error: validation.error,
        to: formattedPhone.replace(/\d(?=\d{4})/g, "*"),
      });
    }

    // Development mode - simulate sending
    if (this.devMode) {
      const mockSid = `MOCK_SM${Date.now()}${Math.random().toString(36).substring(2, 10)}`;
      logger.info(
        `[Twilio DevMode] SMS would be sent to ${formattedPhone}: ${message.substring(0, 50)}...`,
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
      logger.error("[Twilio] Provider not configured - missing credentials");
      return {
        success: false,
        error: "Twilio not configured - missing credentials",
        provider: this.name,
        to: formattedPhone,
        timestamp,
      };
    }

    try {
      const result = await executeWithRetry(
        () =>
          twilioBreaker.run(() =>
            withTimeout(() => this.callTwilioSend(formattedPhone, message), {
              timeoutMs: this.timeoutMs,
            }),
          ),
        {
          maxAttempts: this.maxRetries,
          baseDelayMs: twilioResilience.retries.baseDelayMs,
          label: "twilio-send",
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
      logger.error("[Twilio] Failed to send SMS", {
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
   * Call Twilio API to send SMS
   */
  private async callTwilioSend(
    to: string,
    message: string,
  ): Promise<Pick<SMSResult, "success" | "messageId" | "error" | "rawResponse">> {
    const client = await getTwilioClient();
    if (!client) {
      return {
        success: false,
        error: "Twilio client not initialized",
      };
    }

    try {
      const twilioMessage = await client.messages.create({
        body: message,
        from: TWILIO_PHONE_NUMBER,
        to,
      });

      logger.info("[Twilio] SMS sent successfully", {
        messageSid: twilioMessage.sid,
        to,
        status: twilioMessage.status,
      });

      return {
        success: true,
        messageId: twilioMessage.sid,
        rawResponse: {
          sid: twilioMessage.sid,
          status: twilioMessage.status,
          dateCreated: twilioMessage.dateCreated,
        },
      };
    } catch (error: unknown) {
      const twilioError = error as {
        code?: number;
        message?: string;
        moreInfo?: string;
      };
      const errorMsg =
        twilioError.message || "Unknown Twilio error";
      logger.error("[Twilio] SMS send failed", {
        to,
        error: errorMsg,
        code: twilioError.code,
      });
      return {
        success: false,
        error: errorMsg,
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
    const message = `Your Fixzit verification code is: ${code}. Valid for ${expiresInMinutes} minutes. Do not share this code.`;
    return this.sendSMS(to, message);
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulk(recipients: string[], message: string): Promise<BulkSMSResult> {
    // Enforce maximum recipients limit
    if (recipients.length > MAX_BULK_RECIPIENTS) {
      logger.error("[Twilio] Bulk SMS exceeds maximum recipients", {
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

    const results: SMSResult[] = [];
    let successful = 0;
    let failed = 0;

    // Send sequentially to respect rate limits (O(n) with entries())
    for (const [index, recipient] of recipients.entries()) {
      const result = await this.sendSMS(recipient, message);
      results.push(result);
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
      // Small delay between sends
      if (index < recipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
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
      const client = await getTwilioClient();
      if (!client) {
        return null;
      }

      const message = await client.messages(messageId).fetch();

      return {
        status: mapTwilioStatus(message.status),
        messageId: message.sid,
        updatedAt: message.dateUpdated ?? undefined,
        createdAt: message.dateCreated ?? undefined,
        sentAt: message.dateSent ?? undefined,
        errorCode: message.errorCode ?? undefined,
        errorMessage: message.errorMessage ?? undefined,
      };
    } catch (error) {
      logger.error("[Twilio] Failed to get message status", {
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

    try {
      const client = await getTwilioClient();
      if (!client) {
        return false;
      }
      // Verify account by fetching account info
      await client.api.accounts(TWILIO_ACCOUNT_SID).fetch();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a new Twilio provider instance
 */
export function createTwilioProvider(
  options?: SMSProviderOptions,
): TwilioProvider {
  return new TwilioProvider(options);
}
