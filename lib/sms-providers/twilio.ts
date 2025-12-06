/**
 * Twilio SMS Provider
 *
 * Integration with Twilio for SMS delivery.
 *
 * Note: Twilio has limited support for Saudi Arabia (+966) numbers.
 * Consider using Unifonic for better Saudi market coverage.
 *
 * Environment Variables:
 * - TWILIO_ACCOUNT_SID: Twilio account SID
 * - TWILIO_AUTH_TOKEN: Twilio auth token
 * - TWILIO_PHONE_NUMBER: Twilio phone number to send from
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
  SMSResult,
  SMSStatusResult,
  SMSDeliveryStatus,
} from "./types";

const twilioBreaker = getCircuitBreaker("twilio");
const twilioResilience = SERVICE_RESILIENCE.twilio;

/**
 * Execute Twilio API call with resilience patterns
 */
async function withTwilioResilience<T>(
  label: string,
  operation: () => Promise<T>,
): Promise<T> {
  const timeoutMs =
    label === "sms-status"
      ? twilioResilience.timeouts.statusMs
      : twilioResilience.timeouts.smsSendMs;

  return executeWithRetry(
    () =>
      twilioBreaker.run(() =>
        withTimeout(() => operation(), {
          timeoutMs,
        }),
      ),
    {
      maxAttempts: twilioResilience.retries.maxAttempts,
      baseDelayMs: twilioResilience.retries.baseDelayMs,
      label: `twilio-${label}`,
    },
  );
}

/**
 * Format phone number to E.164 format (+966XXXXXXXXX)
 * Handles common Saudi phone number formats
 */
function formatSaudiPhoneNumber(phone: string): string {
  // Remove all spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-()]/g, "");

  // If already in E.164 format
  if (cleaned.startsWith("+966")) {
    return cleaned;
  }

  // Remove leading zeros
  if (cleaned.startsWith("00966")) {
    return "+" + cleaned.substring(2);
  }

  if (cleaned.startsWith("966")) {
    return "+" + cleaned;
  }

  if (cleaned.startsWith("0")) {
    return "+966" + cleaned.substring(1);
  }

  // Assume local number
  return "+966" + cleaned;
}

/**
 * Validate Saudi phone number
 * Saudi mobile numbers: +966 5XX XXX XXXX (9 digits after country code)
 */
function isValidSaudiPhone(phone: string): boolean {
  const formatted = formatSaudiPhoneNumber(phone);
  // Saudi mobile numbers start with +966 5 and have 9 digits total after country code
  return /^\+9665\d{8}$/.test(formatted);
}

/**
 * Map Twilio status to standardized status
 */
function mapTwilioStatus(status: string): SMSDeliveryStatus {
  switch (status.toLowerCase()) {
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
  readonly name = "twilio";

  private readonly accountSid: string | undefined;
  private readonly authToken: string | undefined;
  private readonly phoneNumber: string | undefined;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  isConfigured(): boolean {
    return Boolean(this.accountSid && this.authToken && this.phoneNumber);
  }

  async sendSMS(to: string, message: string): Promise<SMSResult> {
    const formattedPhone = formatSaudiPhoneNumber(to);

    if (!isValidSaudiPhone(formattedPhone)) {
      const error = `Invalid Saudi phone number format: ${to}`;
      logger.warn("[Twilio] Invalid phone number", { to, formattedPhone });
      return { success: false, error };
    }

    if (!this.isConfigured()) {
      const error =
        "Twilio not configured. Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER";
      logger.warn("[Twilio] Configuration missing", { to: formattedPhone });
      return { success: false, error };
    }

    try {
      const { default: twilio } = await import("twilio");
      const client = twilio(this.accountSid!, this.authToken!);

      const result = await withTwilioResilience("sms-send", () =>
        client.messages.create({
          body: message,
          from: this.phoneNumber,
          to: formattedPhone,
        }),
      );

      logger.info("[Twilio] Message sent successfully", {
        to: formattedPhone,
        messageId: result.sid,
        status: result.status,
      });

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (_error) {
      const error = _error instanceof Error ? _error.message : String(_error);
      logger.error("[Twilio] Send failed", {
        error,
        to: formattedPhone,
      });

      return {
        success: false,
        error,
      };
    }
  }

  async getStatus(messageId: string): Promise<SMSStatusResult | null> {
    if (!this.isConfigured()) {
      logger.warn("[Twilio] Cannot check status - not configured");
      return null;
    }

    try {
      const { default: twilio } = await import("twilio");
      const client = twilio(this.accountSid!, this.authToken!);

      const message = await withTwilioResilience("sms-status", () =>
        client.messages(messageId).fetch(),
      );

      return {
        status: mapTwilioStatus(message.status),
        createdAt: new Date(message.dateCreated),
        sentAt: message.dateSent ? new Date(message.dateSent) : undefined,
        errorCode: message.errorCode || undefined,
        errorMessage: message.errorMessage || undefined,
      };
    } catch (_error) {
      const error = _error instanceof Error ? _error.message : String(_error);
      logger.error("[Twilio] Status check failed", { error, messageId });
      return null;
    }
  }

  async testConfiguration(): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.error("[Twilio] Configuration test failed - missing credentials");
      return false;
    }

    try {
      const { default: twilio } = await import("twilio");
      const client = twilio(this.accountSid!, this.authToken!);

      // Validate credentials by fetching account info
      await withTwilioResilience("config-test", () =>
        client.api.accounts(this.accountSid!).fetch(),
      );

      logger.info("[Twilio] Configuration test passed");
      return true;
    } catch (_error) {
      const error = _error instanceof Error ? _error.message : String(_error);
      logger.error("[Twilio] Configuration test failed", { error });
      return false;
    }
  }
}

/**
 * Export singleton instance
 */
export const twilioProvider = new TwilioProvider();

/**
 * Export formatting utilities for use by other modules
 */
export { formatSaudiPhoneNumber, isValidSaudiPhone };
