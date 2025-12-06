/**
 * SMS Provider Factory
 *
 * Selects the appropriate SMS provider based on configuration.
 * Supports easy switching between Twilio, Unifonic, and mock providers.
 *
 * Usage:
 *   import { getSMSProvider, sendSMS, sendOTP } from "@/lib/sms-providers";
 *
 * Configuration:
 *   SMS_PROVIDER=twilio|unifonic|mock (default: auto-detect)
 *   SMS_DEV_MODE=true|false (force mock mode)
 */

import { logger } from "@/lib/logger";
import type {
  SMSProvider,
  SMSProviderOptions,
  SMSResult,
  BulkSMSResult,
} from "./types";
import { TwilioProvider } from "./twilio";
import { UnifonicProvider } from "./unifonic";

// Re-export types
export type { SMSProvider, SMSProviderType, SMSResult, BulkSMSResult } from "./types";
export { formatSaudiPhoneNumber, isValidSaudiPhone } from "./twilio";

const NODE_ENV = process.env.NODE_ENV || "development";
const SMS_DEV_MODE =
  process.env.SMS_DEV_MODE === "true" ||
  (NODE_ENV !== "production" && process.env.SMS_DEV_MODE !== "false");

/**
 * Mock SMS Provider for development/testing
 */
class MockProvider implements SMSProvider {
  readonly name = "mock";

  isConfigured(): boolean {
    return true; // Mock is always "configured"
  }

  async sendSMS(to: string, message: string): Promise<SMSResult> {
    const messageId = `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    logger.info("[SMS Mock] Message not sent (dev mode)", {
      to,
      messagePreview: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
      messageId,
    });

    // Log full message in development for debugging
    if (NODE_ENV === "development") {
      logger.debug("[SMS Mock] Full Message", {
        to,
        body: message,
        messageId,
      });
    }

    return {
      success: true,
      messageId,
    };
  }

  async testConfiguration(): Promise<boolean> {
    logger.info("[SMS Mock] Configuration test passed (mock mode)");
    return true;
  }
}

const mockProvider = new MockProvider();
const twilioProvider = new TwilioProvider();
const unifonicProvider = new UnifonicProvider();

/**
 * Determine which provider to use based on configuration
 */
function determineProvider(): SMSProvider {
  // Check explicit SMS_PROVIDER setting
  const explicitProvider = process.env.SMS_PROVIDER?.toLowerCase();

  if (explicitProvider === "unifonic") {
    return unifonicProvider;
  }

  if (explicitProvider === "twilio") {
    return twilioProvider;
  }

  if (explicitProvider === "mock") {
    return mockProvider;
  }

  // Auto-detect based on configured credentials
  // Prefer Unifonic for Saudi market
  if (unifonicProvider.isConfigured()) {
    logger.debug("[SMS] Auto-selected Unifonic provider");
    return unifonicProvider;
  }

  if (twilioProvider.isConfigured()) {
    logger.debug("[SMS] Auto-selected Twilio provider");
    return twilioProvider;
  }

  // Fall back to mock if nothing configured
  logger.debug("[SMS] No provider configured, using mock");
  return mockProvider;
}

/**
 * Get the current SMS provider
 */
export function getSMSProvider(options?: SMSProviderOptions): SMSProvider {
  // Force mock mode if SMS_DEV_MODE is enabled
  if (SMS_DEV_MODE || options?.forceDevMode) {
    return mockProvider;
  }

  // Use explicit provider if specified
  if (options?.provider) {
    switch (options.provider) {
      case "unifonic":
        return unifonicProvider;
      case "twilio":
        return twilioProvider;
      case "mock":
        return mockProvider;
    }
  }

  return determineProvider();
}

/**
 * Get the currently active provider name
 */
export function getCurrentProviderName(): string {
  if (SMS_DEV_MODE) {
    return "mock";
  }
  return determineProvider().name;
}

/**
 * Check if SMS dev mode is enabled
 */
export function isSMSDevModeEnabled(): boolean {
  return SMS_DEV_MODE;
}

/**
 * Send SMS using the configured provider
 */
export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  const provider = getSMSProvider();
  return provider.sendSMS(to, message);
}

/**
 * Send OTP code via SMS
 */
export async function sendOTP(to: string, code: string): Promise<SMSResult> {
  const message = `Your Fixzit verification code is: ${code}. Valid for 5 minutes. Do not share this code.`;
  return sendSMS(to, message);
}

/**
 * Send bulk SMS messages
 */
export async function sendBulkSMS(
  recipients: string[],
  message: string,
  options?: { delayMs?: number },
): Promise<BulkSMSResult> {
  const provider = getSMSProvider();
  const results: Array<SMSResult & { recipient: string }> = [];
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const result = await provider.sendSMS(recipient, message);
    results.push({ ...result, recipient });

    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    // Add delay between messages to avoid rate limiting
    if (options?.delayMs && options.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
  }

  logger.info("[SMS] Bulk send completed", {
    provider: provider.name,
    total: recipients.length,
    sent,
    failed,
  });

  return { sent, failed, results };
}

/**
 * Test SMS configuration
 */
export async function testSMSConfiguration(): Promise<boolean> {
  const provider = getSMSProvider();

  if (!provider.testConfiguration) {
    // Mock provider or provider without test support
    return provider.isConfigured();
  }

  return provider.testConfiguration();
}

/**
 * Get SMS status (if supported by provider)
 */
export async function getSMSStatus(messageId: string) {
  const provider = getSMSProvider();

  if (!provider.getStatus) {
    logger.warn("[SMS] Status check not supported by provider", {
      provider: provider.name,
    });
    return null;
  }

  return provider.getStatus(messageId);
}
