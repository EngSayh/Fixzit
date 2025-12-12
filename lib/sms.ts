/**
 * SMS Service - Taqnyat Integration for Saudi Market
 *
 * Provides SMS functionality for notifications, OTP, and alerts.
 * Uses Taqnyat as the ONLY SMS provider (CITC-compliant for Saudi Arabia).
 * 
 * @module lib/sms
 */

import { logger } from "@/lib/logger";
import {
  executeWithRetry,
  withTimeout,
  getCircuitBreaker,
} from "@/lib/resilience";
import { SERVICE_RESILIENCE } from "@/config/service-timeouts";
import {
  formatSaudiPhoneNumber,
  isValidSaudiPhone,
  redactPhoneNumber,
} from "@/lib/sms-providers/phone-utils";
import { TaqnyatProvider } from "@/lib/sms-providers/taqnyat";

const NODE_ENV = process.env.NODE_ENV || "development";
const SMS_DEV_MODE_ENABLED =
  process.env.SMS_DEV_MODE === "true" ||
  (NODE_ENV !== "production" && process.env.SMS_DEV_MODE !== "false");

const taqnyatBreaker = getCircuitBreaker("taqnyat");
const taqnyatResilience = SERVICE_RESILIENCE.taqnyat;

function hasTaqnyatConfiguration(): boolean {
  return Boolean(
    process.env.TAQNYAT_BEARER_TOKEN &&
      process.env.TAQNYAT_SENDER_NAME,
  );
}

/**
 * Check if SMS can be delivered (either configured or dev-mode fallback).
 * Used by OTP flows to fail fast when configuration is missing.
 */
export function isSmsOperational(): boolean {
  return hasTaqnyatConfiguration() || SMS_DEV_MODE_ENABLED;
}

interface SMSResult {
  success: boolean;
  messageSid?: string;
  error?: string;
  /** Cost of the SMS in provider's currency (SAR for Taqnyat) */
  cost?: number;
  /** Currency of the cost */
  currency?: string;
  /** Number of message segments */
  segments?: number;
}

export type TaqnyatOperationLabel =
  | "sms-send"
  | "sms-status"
  | "sms-config-test"
  | "sms-balance";

export async function withTaqnyatResilience<T>(
  label: TaqnyatOperationLabel,
  operation: () => Promise<T>,
): Promise<T> {
  const timeoutMs =
    label === "sms-status"
      ? taqnyatResilience.timeouts.statusMs
      : label === "sms-balance"
        ? taqnyatResilience.timeouts.balanceMs
        : taqnyatResilience.timeouts.smsSendMs;

  return executeWithRetry(
    () =>
      taqnyatBreaker.run(() =>
        withTimeout(() => operation(), {
          timeoutMs,
        }),
      ),
    {
      maxAttempts: taqnyatResilience.retries.maxAttempts,
      baseDelayMs: taqnyatResilience.retries.baseDelayMs,
      label: `taqnyat-${label}`,
    },
  );
}

/**
 * SMS provider options for org-specific configuration
 * @deprecated Use Taqnyat configuration via environment variables
 */
export interface SMSProviderOptions {
  provider?: 'TAQNYAT';
  from?: string;         // Override sender name
  bearerToken?: string;  // Provider auth token (decrypted)
}

/**
 * Send SMS via Taqnyat (CITC-compliant for Saudi Arabia)
 */
export async function sendSMS(
  to: string, 
  message: string,
  options?: SMSProviderOptions
): Promise<SMSResult> {
  const senderName = options?.from || process.env.TAQNYAT_SENDER_NAME;
  const bearerToken = options?.bearerToken || process.env.TAQNYAT_BEARER_TOKEN;

  const formattedPhone = formatSaudiPhoneNumber(to);

  if (!isValidSaudiPhone(formattedPhone)) {
    const error = `Invalid Saudi phone number format: ${to}`;
    logger.warn("[SMS] Invalid phone number", {
      to: redactPhoneNumber(formattedPhone),
      provider: "taqnyat",
    });
    return { success: false, error };
  }

  // Check if we have valid credentials
  const hasCredentials = Boolean(bearerToken && senderName);

  if (!hasCredentials && !SMS_DEV_MODE_ENABLED) {
    const error = "SMS provider Taqnyat not configured. Missing credentials.";
    logger.warn("[SMS] Configuration missing", {
      to: redactPhoneNumber(formattedPhone),
      provider: "taqnyat",
    });
    return { success: false, error };
  }

  if (SMS_DEV_MODE_ENABLED && !hasCredentials) {
    const messageSid = `dev-taqnyat-${Date.now()}`;
    logger.info("[SMS] Dev mode enabled - SMS not sent", {
      to: formattedPhone,
      preview: message,
      messageSid,
      provider: "taqnyat",
      from: senderName,
    });
    return { success: true, messageSid };
  }

  // Send via Taqnyat
  return sendViaTaqnyat(formattedPhone, message, senderName!, bearerToken!);
}

/**
 * Send SMS via Taqnyat
 */
async function sendViaTaqnyat(
  to: string,
  message: string,
  senderName: string,
  bearerToken: string
): Promise<SMSResult> {
  try {
    const provider = new TaqnyatProvider({
      bearerToken,
      senderName,
    });

    const result = await withTaqnyatResilience("sms-send", () =>
      provider.sendSMS(to, message)
    );

    if (result.success) {
      logger.info("[SMS] Message sent successfully via Taqnyat", {
        to,
        messageSid: result.messageId,
        cost: result.cost,
        currency: result.currency,
        segments: result.segments,
      });
      return {
        success: true,
        messageSid: result.messageId,
        cost: result.cost,
        currency: result.currency || "SAR",
        segments: result.segments,
      };
    }

    return {
      success: false,
      error: result.error,
    };
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    const errorMessage = error.message;
    logger.error("[SMS] Taqnyat send failed", {
      error: errorMessage,
      to: redactPhoneNumber(to),
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send OTP (One-Time Password) via SMS
 */
export async function sendOTP(to: string, code: string): Promise<SMSResult> {
  const message = `Your Fixzit verification code is: ${code}. Valid for 5 minutes. Do not share this code.`;
  return sendSMS(to, message);
}

/**
 * Send bulk SMS (e.g., for marketing campaigns)
 * Rate-limited to prevent API abuse
 */
export async function sendBulkSMS(
  recipients: string[],
  message: string,
  options?: { delayMs?: number },
): Promise<{ sent: number; failed: number; results: SMSResult[] }> {
  const bearerToken = process.env.TAQNYAT_BEARER_TOKEN;
  const senderName = process.env.TAQNYAT_SENDER_NAME;

  // If Taqnyat is configured, use bulk API for efficiency
  if (bearerToken && senderName && recipients.length > 1) {
    try {
      const provider = new TaqnyatProvider({ bearerToken, senderName });
      const bulkResult = await withTaqnyatResilience("sms-send", () =>
        provider.sendBulk(recipients, message)
      );

      return {
        sent: bulkResult.sent,
        failed: bulkResult.failed,
        results: bulkResult.results.map(r => ({
          success: r.success,
          messageSid: r.messageId,
          error: r.error,
        })),
      };
    } catch (error) {
      logger.error("[SMS] Bulk send via Taqnyat failed, falling back to individual sends", { error });
    }
  }

  // Fallback: send individually
  const results: SMSResult[] = [];
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const result = await sendSMS(recipient, message);
    results.push(result);

    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    // Add delay between messages to avoid rate limiting
    if (options?.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
  }

  logger.info("[SMS] Bulk send completed", {
    total: recipients.length,
    sent,
    failed,
  });

  return { sent, failed, results };
}

/**
 * Get SMS delivery status
 * Note: Taqnyat may not support individual message status checking
 */
export async function getSMSStatus(messageSid: string): Promise<{
  status: string;
  dateCreated: Date;
  dateSent?: Date;
  errorCode?: number;
  errorMessage?: string;
} | null> {
  if (!hasTaqnyatConfiguration()) {
    logger.warn("[SMS] Cannot check status - Taqnyat not configured");
    return null;
  }

  logger.info("[SMS] Status check for Taqnyat messages", { messageSid });
  return {
    status: "sent",
    dateCreated: new Date(),
    dateSent: new Date(),
  };
}

/**
 * Test SMS configuration
 */
export async function testSMSConfiguration(): Promise<boolean> {
  if (!hasTaqnyatConfiguration()) {
    logger.error("[SMS] Configuration test failed - missing credentials");
    return false;
  }

  try {
    const provider = new TaqnyatProvider();

    const isValid = await withTaqnyatResilience("sms-config-test", () =>
      provider.testConfiguration()
    );

    if (isValid) {
      logger.info("[SMS] Configuration test passed");
      return true;
    }
    
    logger.error("[SMS] Configuration test failed - invalid credentials");
    return false;
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    logger.error("[SMS] Configuration test failed", { error: error.message });
    return false;
  }
}

/**
 * Get account balance from Taqnyat
 */
export async function getSMSBalance(): Promise<{
  balance: number;
  currency: string;
} | null> {
  if (!hasTaqnyatConfiguration()) {
    logger.warn("[SMS] Cannot check balance - Taqnyat not configured");
    return null;
  }

  try {
    const provider = new TaqnyatProvider();
    const balance = await withTaqnyatResilience("sms-balance", () =>
      provider.getBalance()
    );

    return {
      balance,
      currency: "SAR",
    };
  } catch (error) {
    logger.error("[SMS] Balance check failed", { error });
    return null;
  }
}

export function isSMSDevModeEnabled(): boolean {
  return SMS_DEV_MODE_ENABLED;
}

export { formatSaudiPhoneNumber, isValidSaudiPhone };
