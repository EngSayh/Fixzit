/**
 * SMS Service - Twilio Integration for Saudi Market
 * 
 * Provides SMS functionality for notifications, OTP, and alerts.
 * Supports Saudi Arabian phone number formats.
 */

import { logger } from '@/lib/logger';
import { executeWithRetry, withTimeout, getCircuitBreaker } from '@/lib/resilience';
import { SERVICE_RESILIENCE } from '@/config/service-timeouts';

const NODE_ENV = process.env.NODE_ENV || 'development';
const SMS_DEV_MODE_ENABLED =
  process.env.SMS_DEV_MODE === 'true' ||
  (NODE_ENV !== 'production' && process.env.SMS_DEV_MODE !== 'false');

const twilioBreaker = getCircuitBreaker('twilio');
const twilioResilience = SERVICE_RESILIENCE.twilio;

function hasTwilioConfiguration(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
  );
}

interface SMSResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

export type TwilioOperationLabel =
  | 'sms-send'
  | 'sms-status'
  | 'sms-config-test'
  | 'whatsapp-send';

export async function withTwilioResilience<T>(
  label: TwilioOperationLabel,
  operation: () => Promise<T>
): Promise<T> {
  const timeoutMs =
    label === 'sms-status'
      ? twilioResilience.timeouts.statusMs
      : twilioResilience.timeouts.smsSendMs;

  return executeWithRetry(
    () =>
      twilioBreaker.run(() =>
        withTimeout(() => operation(), {
          timeoutMs,
        })
      ),
    {
      maxAttempts: twilioResilience.retries.maxAttempts,
      baseDelayMs: twilioResilience.retries.baseDelayMs,
      label: `twilio-${label}`,
    }
  );
}

/**
 * Format phone number to E.164 format (+966XXXXXXXXX)
 * Handles common Saudi phone number formats
 */
function formatSaudiPhoneNumber(phone: string): string {
  // Remove all spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');
  
  // If already in E.164 format
  if (cleaned.startsWith('+966')) {
    return cleaned;
  }
  
  // Remove leading zeros
  if (cleaned.startsWith('00966')) {
    return '+' + cleaned.substring(2);
  }
  
  if (cleaned.startsWith('966')) {
    return '+' + cleaned;
  }
  
  if (cleaned.startsWith('0')) {
    return '+966' + cleaned.substring(1);
  }
  
  // Assume local number
  return '+966' + cleaned;
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
 * Send SMS via Twilio (or mocked console output in dev mode)
 */
export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  const twilioConfigured = hasTwilioConfiguration();
  const formattedPhone = formatSaudiPhoneNumber(to);

  if (!isValidSaudiPhone(formattedPhone)) {
    const error = `Invalid Saudi phone number format: ${to}`;
    logger.warn('[SMS] Invalid phone number', { to, formattedPhone });
    return { success: false, error };
  }

  if (!twilioConfigured && !SMS_DEV_MODE_ENABLED) {
    const error = 'Twilio not configured. Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER';
    logger.warn('[SMS] Configuration missing', { to: formattedPhone });
    return { success: false, error };
  }

  if (SMS_DEV_MODE_ENABLED) {
    const messageSid = `dev-${Date.now()}`;
    logger.info('[SMS] Dev mode enabled - SMS not sent via Twilio', {
      to: formattedPhone,
      preview: message,
      messageSid,
      twilioConfigured,
    });
    return { success: true, messageSid };
  }

  try {
    const { default: twilio } = await import('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

    const result = await withTwilioResilience('sms-send', () =>
      client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone,
      })
    );

    logger.info('[SMS] Message sent successfully', {
      to: formattedPhone,
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
    logger.error('[SMS] Send failed', {
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
  options?: { delayMs?: number }
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
      await new Promise(resolve => setTimeout(resolve, options.delayMs));
    }
  }

  logger.info('[SMS] Bulk send completed', { total: recipients.length, sent, failed });

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
    logger.warn('[SMS] Cannot check status - Twilio not configured');
    return null;
  }

  try {
    const { default: twilio } = await import('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const message = await withTwilioResilience('sms-status', () =>
      client.messages(messageSid).fetch()
    );

    return {
      status: message.status,
      dateCreated: new Date(message.dateCreated),
      dateSent: message.dateSent ? new Date(message.dateSent) : undefined,
      errorCode: message.errorCode || undefined,
      errorMessage: message.errorMessage || undefined
    };
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error('[SMS] Status check failed', { error, messageSid });
    return null;
  }
}

/**
 * Test SMS configuration
 */
export async function testSMSConfiguration(): Promise<boolean> {
  if (!hasTwilioConfiguration()) {
    logger.error('[SMS] Configuration test failed - missing credentials');
    return false;
  }

  try {
    const { default: twilio } = await import('twilio');
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      logger.error('[SMS] Configuration test failed - missing credentials');
      return false;
    }

    const client = twilio(accountSid, authToken);

    // Validate credentials by fetching account info
    await withTwilioResilience('sms-config-test', () =>
      client.api.accounts(accountSid).fetch()
    );

    logger.info('[SMS] Configuration test passed');
    return true;
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error('[SMS] Configuration test failed', { error });
    return false;
  }
}

export function isSMSDevModeEnabled(): boolean {
  return SMS_DEV_MODE_ENABLED;
}

export { formatSaudiPhoneNumber, isValidSaudiPhone };
