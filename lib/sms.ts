/**
 * SMS Service - Taqnyat Integration for Saudi Market
 *
 * IMPORTANT: Taqnyat is the ONLY production SMS provider for Fixzit.
 * - CITC-compliant for Saudi Arabia
 * - All other providers have been removed
 *
 * Provides SMS functionality for notifications, OTP, and alerts.
 * Supports Saudi Arabian phone number formats.
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
} from "@/lib/sms-providers/phone-utils";
import { TaqnyatProvider, isTaqnyatConfigured } from "@/lib/sms-providers";

const NODE_ENV = process.env.NODE_ENV || "development";
const SMS_DEV_MODE_ENABLED =
  process.env.SMS_DEV_MODE === "true" ||
  (NODE_ENV !== "production" && process.env.SMS_DEV_MODE !== "false");

const taqnyatBreaker = getCircuitBreaker("taqnyat");
const taqnyatResilience = SERVICE_RESILIENCE.taqnyat;

interface SMSResult {
  success: boolean;
  messageSid?: string;
  error?: string;
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
 */
export interface SMSProviderOptions {
  provider?: 'TAQNYAT' | 'LOCAL';
  bearerToken?: string;
  senderName?: string;
}

/**
 * Send SMS via Taqnyat (the ONLY production SMS provider)
 */
export async function sendSMS(
  to: string, 
  message: string,
  options?: SMSProviderOptions
): Promise<SMSResult> {
  const provider = options?.provider || 'TAQNYAT';
  const formattedPhone = formatSaudiPhoneNumber(to);

  if (!isValidSaudiPhone(formattedPhone)) {
    const error = `Invalid Saudi phone number format: ${to}`;
    logger.warn("[SMS] Invalid phone number", { to, formattedPhone, provider });
    return { success: false, error };
  }

  if (!isTaqnyatConfigured() && !SMS_DEV_MODE_ENABLED) {
    const error = "SMS provider Taqnyat not configured. Missing TAQNYAT_BEARER_TOKEN or TAQNYAT_SENDER_NAME.";
    logger.warn("[SMS] Configuration missing", { to: formattedPhone, provider });
    return { success: false, error };
  }

  if (SMS_DEV_MODE_ENABLED && !isTaqnyatConfigured()) {
    const messageSid = `dev-taqnyat-${Date.now()}`;
    logger.info("[SMS] Dev mode enabled - SMS not sent", {
      to: formattedPhone,
      preview: message,
      messageSid,
      provider,
    });
    return { success: true, messageSid };
  }

  try {
    const taqnyatProvider = new TaqnyatProvider({
      timeoutMs: taqnyatResilience.timeouts.smsSendMs,
      maxRetries: taqnyatResilience.retries.maxAttempts,
    });

    const result = await withTaqnyatResilience("sms-send", () =>
      taqnyatProvider.sendSMS(formattedPhone, message)
    );

    return {
      success: result.success,
      messageSid: result.messageId,
      error: result.error,
    };
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    const errorMessage = error.message;
    logger.error("[SMS] Taqnyat send failed", {
      error: errorMessage,
      to: formattedPhone,
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
  const message = `رمز التحقق الخاص بك هو: ${code}. صالح لمدة 5 دقائق.
Your Fixzit verification code is: ${code}. Valid for 5 minutes. Do not share this code.`;
  return sendSMS(to, message);
}

/**
 * Send bulk SMS (e.g., for marketing campaigns)
 * Uses Taqnyat bulk API (max 1000 recipients per request)
 */
export async function sendBulkSMS(
  recipients: string[],
  message: string,
  _options?: { delayMs?: number },
): Promise<{ sent: number; failed: number; results: SMSResult[] }> {
  if (!isTaqnyatConfigured() && !SMS_DEV_MODE_ENABLED) {
    return {
      sent: 0,
      failed: recipients.length,
      results: recipients.map(() => ({
        success: false,
        error: "Taqnyat not configured",
      })),
    };
  }

  if (SMS_DEV_MODE_ENABLED && !isTaqnyatConfigured()) {
    logger.info("[SMS] Dev mode - bulk SMS simulated", {
      total: recipients.length,
    });
    return {
      sent: recipients.length,
      failed: 0,
      results: recipients.map(() => ({
        success: true,
        messageSid: `dev-bulk-${Date.now()}`,
      })),
    };
  }

  try {
    const taqnyatProvider = new TaqnyatProvider();
    const formattedRecipients = recipients.map(formatSaudiPhoneNumber);
    
    const result = await withTaqnyatResilience("sms-send", () =>
      taqnyatProvider.sendBulk(formattedRecipients, message)
    );

    logger.info("[SMS] Bulk send completed", {
      total: recipients.length,
      sent: result.sent,
      failed: result.failed,
    });

    return {
      sent: result.sent,
      failed: result.failed,
      results: result.results.map(r => ({
        success: r.success,
        messageSid: r.messageId,
        error: r.error,
      })),
    };
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    logger.error("[SMS] Bulk send failed", { error: error.message });
    return {
      sent: 0,
      failed: recipients.length,
      results: recipients.map(() => ({
        success: false,
        error: error.message,
      })),
    };
  }
}

/**
 * Get SMS delivery status
 * Note: Taqnyat uses webhooks for delivery reports
 */
export async function getSMSStatus(messageSid: string): Promise<{
  status: string;
  dateCreated: Date;
  dateSent?: Date;
  errorCode?: number;
  errorMessage?: string;
} | null> {
  if (!isTaqnyatConfigured()) {
    logger.warn("[SMS] Cannot check status - Taqnyat not configured");
    return null;
  }

  // Taqnyat uses webhooks for delivery status
  // For now, return unknown status
  void messageSid;
  return {
    status: "unknown",
    dateCreated: new Date(),
  };
}

/**
 * Test SMS configuration
 */
export async function testSMSConfiguration(): Promise<boolean> {
  if (!isTaqnyatConfigured()) {
    logger.error("[SMS] Configuration test failed - missing credentials");
    return false;
  }

  try {
    const taqnyatProvider = new TaqnyatProvider();
    const isValid = await withTaqnyatResilience("sms-config-test", () =>
      taqnyatProvider.testConfiguration()
    );

    if (isValid) {
      logger.info("[SMS] Configuration test passed (Taqnyat)");
    } else {
      logger.error("[SMS] Configuration test failed (Taqnyat)");
    }
    return isValid;
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    logger.error("[SMS] Configuration test failed", { error: error.message });
    return false;
  }
}

/**
 * Get Taqnyat account balance
 */
export async function getSMSBalance(): Promise<{ balance: number; currency: string } | null> {
  if (!isTaqnyatConfigured()) {
    logger.warn("[SMS] Cannot check balance - Taqnyat not configured");
    return null;
  }

  try {
    const taqnyatProvider = new TaqnyatProvider();
    return await withTaqnyatResilience("sms-balance", () =>
      taqnyatProvider.getBalance()
    );
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    logger.error("[SMS] Balance check failed", { error: error.message });
    return null;
  }
}

export function isSMSDevModeEnabled(): boolean {
  return SMS_DEV_MODE_ENABLED;
}

export { formatSaudiPhoneNumber, isValidSaudiPhone };
