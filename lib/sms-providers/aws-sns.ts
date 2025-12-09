/**
 * AWS SNS SMS Provider
 *
 * Implements SMS sending via AWS Simple Notification Service.
 * Supports Saudi Arabia and international phone numbers.
 *
 * Required environment variables:
 * - AWS_SNS_ACCESS_KEY_ID: AWS access key
 * - AWS_SNS_SECRET_ACCESS_KEY: AWS secret key
 * - AWS_SNS_REGION: AWS region (default: me-south-1 for Bahrain)
 * - AWS_SNS_SENDER_ID: Sender ID for SMS (optional, max 11 chars)
 *
 * @module lib/sms-providers/aws-sns
 */

import { logger } from "@/lib/logger";
import { getCircuitBreaker } from "@/lib/resilience";

// Circuit breaker for AWS SNS
const awsSnsBreaker = getCircuitBreaker("aws-sns");
import { formatSaudiPhoneNumber, isValidSaudiPhone } from "./phone-utils";
import type {
  SMSProvider,
  SMSProviderType,
  SMSResult,
  SMSStatusResult,
  SMSDeliveryStatus,
} from "./types";

// AWS SDK v3 - lazy loaded at runtime to avoid compile-time module resolution
// Using 'unknown' types with runtime casting for dynamic imports
type SNSClientType = unknown;
type PublishCommandType = unknown;

let SNSClient: SNSClientType | undefined;
let PublishCommand: PublishCommandType | undefined;

async function getAWSSDK() {
  if (!SNSClient || !PublishCommand) {
    try {
      const sdk = await import("@aws-sdk/client-sns");
      SNSClient = sdk.SNSClient;
      PublishCommand = sdk.PublishCommand;
    } catch {
      throw new Error(
        "AWS SDK not installed. Run: pnpm add @aws-sdk/client-sns",
      );
    }
  }
  return { SNSClient, PublishCommand };
}

export interface AWSSNSConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  senderId?: string;
}

export class AWSSNSProvider implements SMSProvider {
  readonly name: SMSProviderType = "aws_sns";
  private config: AWSSNSConfig;
  private client: unknown = null;

  constructor(config?: Partial<AWSSNSConfig>) {
    this.config = {
      accessKeyId:
        config?.accessKeyId || process.env.AWS_SNS_ACCESS_KEY_ID || "",
      secretAccessKey:
        config?.secretAccessKey ||
        process.env.AWS_SNS_SECRET_ACCESS_KEY ||
        "",
      region: config?.region || process.env.AWS_SNS_REGION || "me-south-1",
      senderId: config?.senderId || process.env.AWS_SNS_SENDER_ID,
    };
  }

  /**
   * Check if AWS SNS is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.config.accessKeyId && this.config.secretAccessKey);
  }

  /**
   * Get or create the SNS client
   */
  private async getClient() {
    if (!this.client) {
      const { SNSClient: Client } = await getAWSSDK();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.client = new (Client as any)({
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
      });
    }
    return this.client;
  }

  /**
   * Send SMS via AWS SNS
   */
  async sendSMS(to: string, message: string): Promise<SMSResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "AWS SNS not configured",
        provider: this.name,
      };
    }

    // Format phone number
    const formattedPhone = isValidSaudiPhone(to)
      ? formatSaudiPhoneNumber(to)
      : to.startsWith("+")
        ? to
        : `+${to}`;

    try {
      const { PublishCommand: Cmd } = await getAWSSDK();
      const client = await this.getClient();

      // Build message attributes
      const messageAttributes: Record<
        string,
        { DataType: string; StringValue: string }
      > = {
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          StringValue: "Transactional", // Or "Promotional" for marketing
        },
      };

      // Add sender ID if configured (for supported regions)
      if (this.config.senderId) {
        messageAttributes["AWS.SNS.SMS.SenderID"] = {
          DataType: "String",
          StringValue: this.config.senderId.substring(0, 11), // Max 11 chars
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const command = new (Cmd as any)({
        PhoneNumber: formattedPhone,
        Message: message,
        MessageAttributes: messageAttributes,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await awsSnsBreaker.run(async () => (client as any).send(command));

      logger.info("[AWS SNS] SMS sent successfully", {
        messageId: response.MessageId,
        to: formattedPhone.replace(/\d(?=\d{4})/g, "*"),
      });

      return {
        success: true,
        messageId: response.MessageId,
        provider: this.name,
        to: formattedPhone,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("[AWS SNS] Failed to send SMS", {
        error: errorMessage,
        to: formattedPhone.replace(/\d(?=\d{4})/g, "*"),
      });

      return {
        success: false,
        error: errorMessage,
        provider: this.name,
      };
    }
  }

  /**
   * Get SMS delivery status (AWS SNS requires CloudWatch for delivery tracking)
   * Note: AWS SNS doesn't provide direct message status API - status comes via webhooks
   */
  async getStatus(_messageId: string): Promise<SMSStatusResult> {
    // AWS SNS requires CloudWatch Logs for delivery status
    // Status updates come via webhook (SNS -> Lambda -> webhook)
    return {
      status: "unknown" as SMSDeliveryStatus,
      messageId: _messageId,
      error:
        "AWS SNS requires webhook for delivery status - check /api/webhooks/sns/sms",
    };
  }

  /**
   * Test the AWS SNS configuration
   */
  async testConfiguration(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      // Just verify we can create a client
      await this.getClient();
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance for convenience
let defaultProvider: AWSSNSProvider | null = null;

export function getAWSSNSProvider(
  config?: Partial<AWSSNSConfig>,
): AWSSNSProvider {
  if (config) {
    return new AWSSNSProvider(config);
  }
  if (!defaultProvider) {
    defaultProvider = new AWSSNSProvider();
  }
  return defaultProvider;
}

export default AWSSNSProvider;
