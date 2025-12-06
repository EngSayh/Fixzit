/**
 * Unifonic SMS Provider
 *
 * Integration with Unifonic (https://www.unifonic.com) for SMS delivery.
 * Unifonic is a leading CPaaS provider in Saudi Arabia and the MENA region,
 * with native support for Saudi phone numbers (+966).
 *
 * API Documentation: https://docs.unifonic.com/articles/api-documentation/sms-api
 *
 * Environment Variables:
 * - UNIFONIC_APP_SID: Application SID from Unifonic console
 * - UNIFONIC_SENDER_ID: Registered sender ID (e.g., "FIXZIT")
 * - UNIFONIC_API_URL: API endpoint (default: https://el.cloud.unifonic.com/rest)
 */

import { logger } from "@/lib/logger";
import {
  executeWithRetry,
  withTimeout,
  getCircuitBreaker,
} from "@/lib/resilience";
import type {
  SMSProvider,
  SMSResult,
  SMSStatusResult,
  SMSDeliveryStatus,
} from "./types";

// Resilience configuration
const UNIFONIC_TIMEOUT_MS = parseInt(
  process.env.UNIFONIC_TIMEOUT_MS || "10000",
  10,
);
const UNIFONIC_MAX_ATTEMPTS = parseInt(
  process.env.UNIFONIC_MAX_ATTEMPTS || "3",
  10,
);
const UNIFONIC_RETRY_DELAY_MS = parseInt(
  process.env.UNIFONIC_RETRY_DELAY_MS || "500",
  10,
);

const unifonicBreaker = getCircuitBreaker("unifonic");

/**
 * Unifonic API response structure for send message
 */
interface UnifonicSendResponse {
  success: boolean;
  message: string;
  errorCode?: string;
  data?: {
    MessageID?: string;
    CorrelationID?: string;
    Status?: string;
    NumberOfUnits?: number;
    Cost?: number;
    Balance?: number;
    Recipient?: string;
    TimeCreated?: string;
  };
}

/**
 * Unifonic API response for message status
 */
interface UnifonicStatusResponse {
  success: boolean;
  message: string;
  data?: {
    MessageID?: string;
    Status?: string;
    DeliveryStatus?: string;
    SentTime?: string;
    DeliveryTime?: string;
    ErrorCode?: string;
  };
}

/**
 * Format phone number for Unifonic
 * Unifonic accepts E.164 format (+966XXXXXXXXX) or local format (5XXXXXXXX)
 */
function formatPhoneForUnifonic(phone: string): string {
  // Remove all spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-()]/g, "");

  // If already in E.164 format with +, return as is
  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  // Handle 00966 prefix
  if (cleaned.startsWith("00966")) {
    return "+" + cleaned.substring(2);
  }

  // Handle 966 prefix without +
  if (cleaned.startsWith("966")) {
    return "+" + cleaned;
  }

  // Handle local format starting with 0
  if (cleaned.startsWith("0")) {
    return "+966" + cleaned.substring(1);
  }

  // Handle local format without leading 0 (e.g., 5XXXXXXXX)
  if (cleaned.startsWith("5") && cleaned.length === 9) {
    return "+966" + cleaned;
  }

  // Return with +966 prefix as fallback
  return "+966" + cleaned;
}

/**
 * Map Unifonic status to standardized status
 */
function mapUnifonicStatus(status?: string): SMSDeliveryStatus {
  if (!status) return "unknown";

  const normalized = status.toUpperCase();

  switch (normalized) {
    case "QUEUED":
    case "ACCEPTED":
      return "queued";
    case "SENDING":
    case "PENDING":
      return "sending";
    case "SENT":
      return "sent";
    case "DELIVERED":
      return "delivered";
    case "FAILED":
    case "REJECTED":
      return "failed";
    case "UNDELIVERED":
    case "EXPIRED":
      return "undelivered";
    default:
      return "unknown";
  }
}

/**
 * Execute Unifonic API call with resilience patterns
 */
async function withUnifonicResilience<T>(
  label: string,
  operation: () => Promise<T>,
): Promise<T> {
  return executeWithRetry(
    () =>
      unifonicBreaker.run(() =>
        withTimeout(() => operation(), {
          timeoutMs: UNIFONIC_TIMEOUT_MS,
        }),
      ),
    {
      maxAttempts: UNIFONIC_MAX_ATTEMPTS,
      baseDelayMs: UNIFONIC_RETRY_DELAY_MS,
      label: `unifonic-${label}`,
    },
  );
}

/**
 * Unifonic SMS Provider Implementation
 */
export class UnifonicProvider implements SMSProvider {
  readonly name = "unifonic";

  private readonly appSid: string | undefined;
  private readonly senderId: string | undefined;
  private readonly apiUrl: string;

  constructor() {
    this.appSid = process.env.UNIFONIC_APP_SID;
    this.senderId = process.env.UNIFONIC_SENDER_ID || "FIXZIT";
    this.apiUrl =
      process.env.UNIFONIC_API_URL || "https://el.cloud.unifonic.com/rest";
  }

  isConfigured(): boolean {
    return Boolean(this.appSid);
  }

  async sendSMS(to: string, message: string): Promise<SMSResult> {
    if (!this.isConfigured()) {
      const error =
        "Unifonic not configured. Missing UNIFONIC_APP_SID environment variable.";
      logger.warn("[Unifonic] Configuration missing", { to });
      return { success: false, error };
    }

    const formattedPhone = formatPhoneForUnifonic(to);

    try {
      const response = await withUnifonicResilience("sms-send", async () => {
        const res = await fetch(`${this.apiUrl}/SMS/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            AppSid: this.appSid!,
            Recipient: formattedPhone,
            Body: message,
            SenderID: this.senderId!,
          }).toString(),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Unifonic API error: ${res.status} - ${text}`);
        }

        return res.json() as Promise<UnifonicSendResponse>;
      });

      if (response.success && response.data?.MessageID) {
        logger.info("[Unifonic] Message sent successfully", {
          to: formattedPhone,
          messageId: response.data.MessageID,
          status: response.data.Status,
          cost: response.data.Cost,
        });

        return {
          success: true,
          messageId: response.data.MessageID,
          rawResponse: response,
        };
      } else {
        const error = response.message || response.errorCode || "Unknown error";
        logger.error("[Unifonic] Send failed", {
          to: formattedPhone,
          error,
          errorCode: response.errorCode,
        });

        return {
          success: false,
          error,
          rawResponse: response,
        };
      }
    } catch (_error) {
      const error = _error instanceof Error ? _error.message : String(_error);
      logger.error("[Unifonic] Send failed", {
        error,
        to: formattedPhone,
      });

      return {
        success: false,
        error,
      };
    }
  }

  async getStatus(messageId: string): Promise<SMSStatusResult | null> {
    if (!this.isConfigured()) {
      logger.warn("[Unifonic] Cannot check status - not configured");
      return null;
    }

    try {
      const response = await withUnifonicResilience("sms-status", async () => {
        const res = await fetch(
          `${this.apiUrl}/SMS/messages/status?AppSid=${this.appSid}&MessageID=${messageId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Unifonic API error: ${res.status} - ${text}`);
        }

        return res.json() as Promise<UnifonicStatusResponse>;
      });

      if (response.success && response.data) {
        return {
          status: mapUnifonicStatus(
            response.data.DeliveryStatus || response.data.Status,
          ),
          createdAt: response.data.SentTime
            ? new Date(response.data.SentTime)
            : new Date(),
          sentAt: response.data.DeliveryTime
            ? new Date(response.data.DeliveryTime)
            : undefined,
          errorCode: response.data.ErrorCode,
        };
      }

      return null;
    } catch (_error) {
      const error = _error instanceof Error ? _error.message : String(_error);
      logger.error("[Unifonic] Status check failed", { error, messageId });
      return null;
    }
  }

  async testConfiguration(): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.error(
        "[Unifonic] Configuration test failed - missing credentials",
      );
      return false;
    }

    try {
      // Unifonic has an account info endpoint we can use to validate credentials
      const response = await withUnifonicResilience("config-test", async () => {
        const res = await fetch(
          `${this.apiUrl}/Account/GetBalance?AppSid=${this.appSid}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        return res.ok;
      });

      if (response) {
        logger.info("[Unifonic] Configuration test passed");
        return true;
      }

      logger.error("[Unifonic] Configuration test failed - invalid response");
      return false;
    } catch (_error) {
      const error = _error instanceof Error ? _error.message : String(_error);
      logger.error("[Unifonic] Configuration test failed", { error });
      return false;
    }
  }
}

/**
 * Export singleton instance
 */
export const unifonicProvider = new UnifonicProvider();

/**
 * Export formatting utility for use by other modules
 */
export { formatPhoneForUnifonic };
