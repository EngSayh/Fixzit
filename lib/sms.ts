/**
 * SMS Service - Taqnyat Integration for Saudi Market
 *
 * Provides SMS functionality for notifications, OTP, and alerts.
 * Supports Saudi Arabian phone number formats.
 * Uses Taqnyat as the CITC-compliant SMS provider.
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

// Legacy providers - kept for backward compatibility but deprecated
import { UnifonicProvider as _UnifonicProvider } from "@/lib/sms-providers/unifonic";
import { AWSSNSProvider as _AWSSNSProvider } from "@/lib/sms-providers/aws-sns";
import { NexmoProvider as _NexmoProvider } from "@/lib/sms-providers/nexmo";

const NODE_ENV = process.env.NODE_ENV || "development";
const SMS_DEV_MODE_ENABLED =
  process.env.SMS_DEV_MODE === "true" ||
  (NODE_ENV !== "production" && process.env.SMS_DEV_MODE !== "false");

// Circuit breaker for SMS providers
const smsBreaker = getCircuitBreaker("sms");
const smsResilience = SERVICE_RESILIENCE.twilio; // Reuse twilio config for SMS resilience

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

export type SMSOperationLabel =
  | "sms-send"
  | "sms-status"
  | "sms-config-test"
  | "whatsapp-send";

/**
 * Execute SMS operation with circuit breaker, timeout, and retry
 */
export async function withSMSResilience<T>(
  label: SMSOperationLabel,
  operation: () => Promise<T>,
): Promise<T> {
  const timeoutMs =
    label === "sms-status"
      ? smsResilience.timeouts.statusMs
      : smsResilience.timeouts.smsSendMs;

  return executeWithRetry(
    () =>
      smsBreaker.run(() =>
        withTimeout(() => operation(), {
          timeoutMs,
        }),
      ),
    {
      maxAttempts: smsResilience.retries.maxAttempts,
      baseDelayMs: smsResilience.retries.baseDelayMs,
      label: `sms-${label}`,
    },
  );
}

// Backward compatibility alias
/** @deprecated Use withSMSResilience instead */
export const withTwilioResilience = withSMSResilience;
/** @deprecated Use SMSOperationLabel instead */
export type TwilioOperationLabel = SMSOperationLabel;

// Note: formatSaudiPhoneNumber and isValidSaudiPhone are now imported from phone-utils
// and re-exported at the end of this file for backward compatibility

/**
 * SMS provider options for org-specific configuration
 * 🔒 SECURITY: Allows per-org SMS provider settings
 * NOTE: Taqnyat is the only CITC-compliant production provider for Saudi Arabia
 */
export interface SMSProviderOptions {
  provider?: 'TAQNYAT' | 'MOCK';
  from?: string;         // Override sender number/name
  accountSid?: string;   // Provider account ID (for Taqnyat: sender name)
  authToken?: string;    // Provider auth token (for Taqnyat: bearer token)
}

/**
 * Send SMS via configured provider (default: Taqnyat - CITC-compliant for Saudi Arabia)
 * 🔒 SECURITY: Supports per-org provider configuration via options parameter
 */
export async function sendSMS(
  to: string, 
  message: string,
  options?: SMSProviderOptions
): Promise<SMSResult> {
  const provider = options?.provider || 'TAQNYAT';
  const fromNumber = options?.from || process.env.TAQNYAT_SENDER_NAME;
  const accountSid = options?.accountSid || process.env.TAQNYAT_SENDER_NAME;
  const authToken = options?.authToken || process.env.TAQNYAT_BEARER;

  const formattedPhone = formatSaudiPhoneNumber(to);

  if (!isValidSaudiPhone(formattedPhone)) {
    const error = `Invalid Saudi phone number format: ${to}`;
    logger.warn("[SMS] Invalid phone number", { to, formattedPhone, provider });
    return { success: false, error };
  }

  // Check if we have valid credentials for the selected provider
  const hasCredentials = provider === 'TAQNYAT' 
    ? Boolean(accountSid && authToken && fromNumber)
    : provider === 'MOCK'; // MOCK always has "credentials"

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
    case 'TAQNYAT': {
      // Taqnyat - CITC-compliant SMS provider for Saudi Arabia
      return sendViaTaqnyat(formattedPhone, message, fromNumber!, authToken!);
    }
    
    case 'MOCK': {
      // Mock provider for testing - returns success without sending
      const messageSid = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      logger.info("[SMS] Mock provider - SMS simulated", {
        to: formattedPhone,
        preview: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        messageSid,
        provider: 'MOCK',
      });
      return { success: true, messageSid };
    }
    
    default:
      return { success: false, error: `Unknown SMS provider: ${provider}` };
  }
}

/**
 * Send SMS via Taqnyat (CITC-compliant for Saudi Arabia)
 * 🔒 SECURITY: Accepts credentials as params for per-org config
 * @see https://taqnyat.sa/docs
 */
async function sendViaTaqnyat(
  to: string,
  message: string,
  senderName: string,
  bearerToken: string
): Promise<SMSResult> {
  try {
    const response = await fetch("https://api.taqnyat.sa/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({
        recipients: [to],
        body: message,
        sender: senderName,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.statusCode !== 200) {
      const errorMessage = data.message || `Taqnyat API error: ${response.status}`;
      logger.error("[SMS] Taqnyat send failed", {
        error: errorMessage,
        statusCode: data.statusCode,
        to,
      });
      return {
        success: false,
        error: errorMessage,
      };
    }

    const messageSid = data.messageId || `taqnyat-${Date.now()}`;
    logger.info("[SMS] Message sent successfully via Taqnyat", {
      to,
      messageSid,
      status: "sent",
    });

    return {
      success: true,
      messageSid,
    };
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[SMS] Taqnyat send failed", {
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
 * Send SMS via Twilio (DEPRECATED - kept for reference, use Taqnyat for Saudi market)
 * 🔒 SECURITY: Accepts credentials as params for per-org config
 * @deprecated Use sendViaTaqnyat instead - Twilio not CITC-compliant for Saudi market
 */
async function _sendViaTwilio(
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
