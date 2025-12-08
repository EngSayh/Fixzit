/**
 * SMS Service - Twilio Integration for Saudi Market
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

const NODE_ENV = process.env.NODE_ENV || "development";
const SMS_DEV_MODE_ENABLED =
  process.env.SMS_DEV_MODE === "true" ||
  (NODE_ENV !== "production" && process.env.SMS_DEV_MODE !== "false");

const twilioBreaker = getCircuitBreaker("twilio");
const twilioResilience = SERVICE_RESILIENCE.twilio;

function hasTwilioConfiguration(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER,
  );
}

interface SMSResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

export type TwilioOperationLabel =
  | "sms-send"
  | "sms-status"
  | "sms-config-test"
  | "whatsapp-send";

export async function withTwilioResilience<T>(
  label: TwilioOperationLabel,
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

// Note: formatSaudiPhoneNumber and isValidSaudiPhone are now imported from phone-utils
// and re-exported at the end of this file for backward compatibility

/**
 * SMS provider options for org-specific configuration
 * 🔒 SECURITY: Allows per-org SMS provider settings (Twilio, Unifonic, etc.)
 */
export interface SMSProviderOptions {
  provider?: 'TWILIO' | 'UNIFONIC' | 'AWS_SNS' | 'NEXMO';
  from?: string;         // Override sender number
  accountSid?: string;   // Provider account ID
  authToken?: string;    // Provider auth token (decrypted)
}

/**
 * Send SMS via configured provider (default: Twilio)
 * 🔒 SECURITY: Supports per-org provider configuration via options parameter
 */
export async function sendSMS(
  to: string, 
  message: string,
  options?: SMSProviderOptions
): Promise<SMSResult> {
  const provider = options?.provider || 'TWILIO';
  const fromNumber = options?.from || process.env.TWILIO_PHONE_NUMBER;
  const accountSid = options?.accountSid || process.env.TWILIO_ACCOUNT_SID;
  const authToken = options?.authToken || process.env.TWILIO_AUTH_TOKEN;

  const formattedPhone = formatSaudiPhoneNumber(to);

  if (!isValidSaudiPhone(formattedPhone)) {
    const error = `Invalid Saudi phone number format: ${to}`;
    logger.warn("[SMS] Invalid phone number", { to, formattedPhone, provider });
    return { success: false, error };
  }

  // Check if we have valid credentials for the selected provider
  const hasCredentials = provider === 'TWILIO' 
    ? Boolean(accountSid && authToken && fromNumber)
    : false; // Other providers not yet implemented

  if (!hasCredentials && !SMS_DEV_MODE_ENABLED) {
    const error = `SMS provider ${provider} not configured. Missing credentials.`;
    logger.warn("[SMS] Configuration missing", { to: formattedPhone, provider });
    return { success: false, error };
  }

  if (SMS_DEV_MODE_ENABLED) {
    const messageSid = `dev-${provider.toLowerCase()}-${Date.now()}`;
    logger.info("[SMS] Dev mode enabled - SMS not sent", {
      to: formattedPhone,
      preview: message,
      messageSid,
      provider,
      from: fromNumber,
    });
    return { success: true, messageSid };
  }

  // Route to appropriate provider
  switch (provider) {
    case 'TWILIO':
      return sendViaTwilio(formattedPhone, message, fromNumber!, accountSid!, authToken!);
    
    case 'UNIFONIC':
      // TODO: Implement Unifonic provider for Saudi market
      logger.warn("[SMS] Unifonic provider not yet implemented, falling back to Twilio");
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        return sendViaTwilio(
          formattedPhone,
          message,
          process.env.TWILIO_PHONE_NUMBER,
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
      }
      return { success: false, error: 'Unifonic provider not implemented and Twilio fallback not configured' };
    
    case 'AWS_SNS':
      // TODO: Implement AWS SNS provider
      logger.warn("[SMS] AWS SNS provider not yet implemented");
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        logger.warn("[SMS] Falling back to Twilio for AWS_SNS provider");
        return sendViaTwilio(
          formattedPhone,
          message,
          process.env.TWILIO_PHONE_NUMBER,
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
      }
      return { success: false, error: 'AWS SNS provider not implemented' };
    
    case 'NEXMO':
      // TODO: Implement Nexmo/Vonage provider
      logger.warn("[SMS] Nexmo provider not yet implemented");
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        logger.warn("[SMS] Falling back to Twilio for Nexmo provider");
        return sendViaTwilio(
          formattedPhone,
          message,
          process.env.TWILIO_PHONE_NUMBER,
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
      }
      return { success: false, error: 'Nexmo provider not implemented' };
    
    default:
      return { success: false, error: `Unknown SMS provider: ${provider}` };
  }
}

/**
 * Send SMS via Twilio
 * 🔒 SECURITY: Accepts credentials as params for per-org config
 */
async function sendViaTwilio(
  to: string,
  message: string,
  from: string,
  accountSid: string,
  authToken: string
): Promise<SMSResult> {
  try {
    const { default: twilio } = await import("twilio");
    const client = twilio(accountSid, authToken);

    const result = await withTwilioResilience("sms-send", () =>
      client.messages.create({
        body: message,
        from,
        to,
      }),
    );

    logger.info("[SMS] Message sent successfully via Twilio", {
      to,
      messageSid: result.sid,
      status: result.status,
    });

    return {
      success: true,
      messageSid: result.sid,
    };
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[SMS] Twilio send failed", {
      error: errorMessage,
      to,
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
 * Get SMS delivery status from Twilio
 */
export async function getSMSStatus(messageSid: string): Promise<{
  status: string;
  dateCreated: Date;
  dateSent?: Date;
  errorCode?: number;
  errorMessage?: string;
} | null> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    logger.warn("[SMS] Cannot check status - Twilio not configured");
    return null;
  }

  try {
    const { default: twilio } = await import("twilio");
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );

    const message = await withTwilioResilience("sms-status", () =>
      client.messages(messageSid).fetch(),
    );

    return {
      status: message.status,
      dateCreated: new Date(message.dateCreated),
      dateSent: message.dateSent ? new Date(message.dateSent) : undefined,
      errorCode: message.errorCode || undefined,
      errorMessage: message.errorMessage || undefined,
    };
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[SMS] Status check failed", { error, messageSid });
    return null;
  }
}

/**
 * Test SMS configuration
 */
export async function testSMSConfiguration(): Promise<boolean> {
  if (!hasTwilioConfiguration()) {
    logger.error("[SMS] Configuration test failed - missing credentials");
    return false;
  }

  try {
    const { default: twilio } = await import("twilio");
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      logger.error("[SMS] Configuration test failed - missing credentials");
      return false;
    }

    const client = twilio(accountSid, authToken);

    // Validate credentials by fetching account info
    await withTwilioResilience("sms-config-test", () =>
      client.api.accounts(accountSid).fetch(),
    );

    logger.info("[SMS] Configuration test passed");
    return true;
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[SMS] Configuration test failed", { error });
    return false;
  }
}

export function isSMSDevModeEnabled(): boolean {
  return SMS_DEV_MODE_ENABLED;
}

export { formatSaudiPhoneNumber, isValidSaudiPhone };
