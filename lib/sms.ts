/**
 * SMS Service - Multi-Provider Integration for Saudi Market
 *
 * Provides SMS functionality for notifications, OTP, and alerts.
 * Supports multiple SMS providers:
 * - Unifonic (recommended for Saudi Arabia)
 * - Twilio (limited KSA support)
 * - Mock (development/testing)
 *
 * Configuration:
 *   SMS_PROVIDER=twilio|unifonic|mock (default: auto-detect)
 *   SMS_DEV_MODE=true|false (force mock mode)
 *
 * For Saudi Arabia operations, set SMS_PROVIDER=unifonic
 */

import {
  sendSMS as providerSendSMS,
  sendOTP as providerSendOTP,
  sendBulkSMS as providerSendBulkSMS,
  getSMSStatus as providerGetSMSStatus,
  testSMSConfiguration as providerTestSMSConfiguration,
  isSMSDevModeEnabled as providerIsSMSDevModeEnabled,
  formatSaudiPhoneNumber,
  isValidSaudiPhone,
  getSMSProvider,
  getCurrentProviderName,
} from "@/lib/sms-providers";
import {
  executeWithRetry,
  withTimeout,
  getCircuitBreaker,
} from "@/lib/resilience";
import { SERVICE_RESILIENCE } from "@/config/service-timeouts";

// Re-export provider utilities for backward compatibility
export { formatSaudiPhoneNumber, isValidSaudiPhone, getSMSProvider, getCurrentProviderName };

/**
 * @deprecated Use SMSResult from @/lib/sms-providers instead
 */
interface SMSResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

// Legacy Twilio resilience exports for backward compatibility
const twilioBreaker = getCircuitBreaker("twilio");
const twilioResilience = SERVICE_RESILIENCE.twilio;

export type TwilioOperationLabel =
  | "sms-send"
  | "sms-status"
  | "sms-config-test"
  | "whatsapp-send";

/**
 * @deprecated Use provider abstraction instead
 */
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

/**
 * Send SMS using the configured provider
 * Uses Unifonic for Saudi Arabia, Twilio as fallback, Mock for dev mode
 */
export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  const result = await providerSendSMS(to, message);

  // Map to legacy SMSResult format for backward compatibility
  return {
    success: result.success,
    messageSid: result.messageId,
    error: result.error,
  };
}

/**
 * Send OTP (One-Time Password) via SMS
 */
export async function sendOTP(to: string, code: string): Promise<SMSResult> {
  const result = await providerSendOTP(to, code);

  return {
    success: result.success,
    messageSid: result.messageId,
    error: result.error,
  };
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
  const bulkResult = await providerSendBulkSMS(recipients, message, options);

  // Map to legacy format
  const results: SMSResult[] = bulkResult.results.map((r) => ({
    success: r.success,
    messageSid: r.messageId,
    error: r.error,
  }));

  return {
    sent: bulkResult.sent,
    failed: bulkResult.failed,
    results,
  };
}

/**
 * Get SMS delivery status from current provider
 */
export async function getSMSStatus(messageSid: string): Promise<{
  status: string;
  dateCreated: Date;
  dateSent?: Date;
  errorCode?: number;
  errorMessage?: string;
} | null> {
  const result = await providerGetSMSStatus(messageSid);

  if (!result) {
    return null;
  }

  return {
    status: result.status,
    dateCreated: result.createdAt,
    dateSent: result.sentAt,
    errorCode:
      typeof result.errorCode === "number"
        ? result.errorCode
        : result.errorCode
          ? parseInt(result.errorCode, 10) || undefined
          : undefined,
    errorMessage: result.errorMessage,
  };
}

/**
 * Test SMS configuration
 */
export async function testSMSConfiguration(): Promise<boolean> {
  return providerTestSMSConfiguration();
}

/**
 * Check if SMS dev mode is enabled
 */
export function isSMSDevModeEnabled(): boolean {
  return providerIsSMSDevModeEnabled();
}
