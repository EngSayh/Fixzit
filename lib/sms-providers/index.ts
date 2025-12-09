/**
 * SMS Provider Factory
 *
 * Factory for creating SMS providers based on configuration.
 * 
 * IMPORTANT: Taqnyat is the ONLY production SMS provider for Fixzit.
 * - Taqnyat is CITC-compliant for Saudi Arabia
 * - Mock provider is available for development/testing only
 * 
 * All other providers (Twilio, Unifonic, AWS SNS, Nexmo) have been removed.
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
import { TaqnyatProvider, isTaqnyatConfigured } from "./taqnyat";

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

// Re-export Taqnyat provider
export { TaqnyatProvider, isTaqnyatConfigured, getTaqnyatProvider } from "./taqnyat";

/**
 * Environment configuration
 */
const SMS_PROVIDER = process.env.SMS_PROVIDER as SMSProviderType | undefined;
const NODE_ENV = process.env.NODE_ENV || "development";
const SMS_DEV_MODE_ENABLED =
  process.env.SMS_DEV_MODE === "true" ||
  (NODE_ENV !== "production" && process.env.SMS_DEV_MODE !== "false");

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
 * Priority: Explicit config > Taqnyat > Mock
 */
function detectProvider(): SMSProviderType {
  // If explicitly configured, use that
  if (SMS_PROVIDER && ["taqnyat", "mock"].includes(SMS_PROVIDER)) {
    return SMS_PROVIDER;
  }

  // In development mode, prefer mock unless Taqnyat is configured
  if (SMS_DEV_MODE_ENABLED) {
    if (isTaqnyatConfigured()) return "taqnyat";
    return "mock";
  }

  // Production: use Taqnyat if configured
  if (isTaqnyatConfigured()) {
    logger.info("[SMS] Using Taqnyat provider (CITC-compliant for KSA)");
    return "taqnyat";
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
    case "taqnyat":
      return new TaqnyatProvider(options);
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
      configured: isTaqnyatConfigured(),
      recommended: true,
      notes: "CITC-compliant - The ONLY production SMS provider for Fixzit",
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
