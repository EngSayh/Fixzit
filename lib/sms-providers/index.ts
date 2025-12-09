/**
 * SMS Provider Factory
 *
 * Factory for creating SMS providers based on configuration.
 * Supports Twilio, Unifonic, and mock providers.
 *
 * For Saudi Arabia (KSA), Unifonic is recommended as Twilio has limited support.
 */

import { logger } from "@/lib/logger";
import type {
  SMSProvider,
  SMSProviderType,
  SMSProviderOptions,
  SMSResult,
  SMSStatusResult,
  SMSDeliveryStatus,
  BulkSMSResult,
} from "./types";
import { createTwilioProvider } from "./twilio";
import { createUnifonicProvider } from "./unifonic";

// Re-export types for convenience
export type {
  SMSProvider,
  SMSProviderType,
  SMSProviderOptions,
  SMSResult,
  SMSStatusResult,
  SMSDeliveryStatus,
  BulkSMSResult,
};

// Re-export providers
export { TwilioProvider, createTwilioProvider } from "./twilio";
export { UnifonicProvider, createUnifonicProvider } from "./unifonic";
export { AWSSNSProvider } from "./aws-sns";
export { NexmoProvider } from "./nexmo";

/**
 * Environment configuration
 */
const SMS_PROVIDER = process.env.SMS_PROVIDER as SMSProviderType | undefined;
const NODE_ENV = process.env.NODE_ENV || "development";
const SMS_DEV_MODE_ENABLED =
  process.env.SMS_DEV_MODE === "true" ||
  (NODE_ENV !== "production" && process.env.SMS_DEV_MODE !== "false");

/**
 * Check if Unifonic is configured
 */
function isUnifonicConfigured(): boolean {
  return Boolean(process.env.UNIFONIC_APP_SID && process.env.UNIFONIC_SENDER_ID);
}

/**
 * Check if Twilio is configured
 */
function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER,
  );
}

/**
 * Mock SMS Provider for development/testing
 */
class MockProvider implements SMSProvider {
  readonly name: SMSProviderType = "mock";

  isConfigured(): boolean {
    return true;
  }

  async sendSMS(to: string, message: string): Promise<SMSResult> {
    const mockId = `MOCK_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    logger.info(`[Mock SMS] To: ${to}, Message: ${message.substring(0, 50)}...`);
    return {
      success: true,
      messageId: mockId,
      provider: this.name,
      to,
      timestamp: new Date(),
    };
  }

  async sendOTP(
    to: string,
    code: string,
    expiresInMinutes: number = 5,
  ): Promise<SMSResult> {
    const message = `Your verification code is: ${code}. Valid for ${expiresInMinutes} minutes.`;
    return this.sendSMS(to, message);
  }

  async sendBulk(recipients: string[], message: string): Promise<BulkSMSResult> {
    const results = await Promise.all(
      recipients.map((recipient) => this.sendSMS(recipient, message)),
    );
    const successful = results.filter((r) => r.success).length;
    return {
      total: recipients.length,
      successful,
      sent: successful,
      failed: recipients.length - successful,
      results,
    };
  }

  async getStatus(messageId: string): Promise<SMSStatusResult | null> {
    return {
      status: "delivered",
      messageId,
      updatedAt: new Date(),
      createdAt: new Date(),
      sentAt: new Date(),
    };
  }

  async testConfiguration(): Promise<boolean> {
    return true;
  }
}

/**
 * Detect the best available provider
 * Priority: Explicit config > Unifonic (for KSA) > Twilio > Mock
 */
function detectProvider(): SMSProviderType {
  // If explicitly configured, use that
  if (SMS_PROVIDER && ["twilio", "unifonic", "mock"].includes(SMS_PROVIDER)) {
    return SMS_PROVIDER;
  }

  // In development mode, prefer mock unless explicitly configured
  if (SMS_DEV_MODE_ENABLED) {
    // If any provider is configured, still use it for testing
    if (isUnifonicConfigured()) return "unifonic";
    if (isTwilioConfigured()) return "twilio";
    return "mock";
  }

  // Production: prefer Unifonic for KSA support
  if (isUnifonicConfigured()) {
    logger.info("[SMS] Using Unifonic provider (recommended for KSA)");
    return "unifonic";
  }

  if (isTwilioConfigured()) {
    logger.info("[SMS] Using Twilio provider");
    return "twilio";
  }

  // Fallback to mock if nothing configured
  logger.warn("[SMS] No provider configured - using mock provider");
  return "mock";
}

/**
 * Create an SMS provider instance
 * @param type Optional provider type (auto-detects if not specified)
 * @param options Optional provider options
 */
export function createSMSProvider(
  type?: SMSProviderType,
  options?: SMSProviderOptions,
): SMSProvider {
  const providerType = type || detectProvider();

  switch (providerType) {
    case "unifonic":
      return createUnifonicProvider(options);
    case "twilio":
      return createTwilioProvider(options);
    case "mock":
    default:
      return new MockProvider();
  }
}

/**
 * Get the currently configured provider type
 */
export function getConfiguredProviderType(): SMSProviderType {
  return detectProvider();
}

/**
 * Get info about all available providers and their configuration status
 */
export function getProvidersInfo(): Record<
  SMSProviderType,
  { configured: boolean; recommended: boolean; notes: string }
> {
  return {
    taqnyat: {
      configured: Boolean(process.env.TAQNYAT_BEARER_TOKEN && process.env.TAQNYAT_SENDER_ID),
      recommended: true,
      notes: "CITC compliant SMS provider for Saudi Arabia",
    },
    unifonic: {
      configured: isUnifonicConfigured(),
      recommended: true,
      notes: "Recommended for Saudi Arabia and MENA region",
    },
    twilio: {
      configured: isTwilioConfigured(),
      recommended: false,
      notes: "Limited support for Saudi Arabia",
    },
    aws_sns: {
      configured: Boolean(process.env.AWS_SNS_ACCESS_KEY_ID && process.env.AWS_SNS_SECRET_ACCESS_KEY),
      recommended: false,
      notes: "AWS SNS for enterprise SMS delivery",
    },
    nexmo: {
      configured: Boolean(process.env.NEXMO_API_KEY && process.env.NEXMO_API_SECRET),
      recommended: false,
      notes: "Vonage/Nexmo for global SMS delivery",
    },
    mock: {
      configured: true,
      recommended: false,
      notes: "Development/testing only - does not send real SMS",
    },
  };
}

// Default provider instance (lazy initialized)
let defaultProvider: SMSProvider | null = null;

/**
 * Get the default SMS provider instance (singleton)
 */
export function getSMSProvider(): SMSProvider {
  if (!defaultProvider) {
    defaultProvider = createSMSProvider();
  }
  return defaultProvider;
}

/**
 * Reset the default provider (useful for testing)
 */
export function resetSMSProvider(): void {
  defaultProvider = null;
}
