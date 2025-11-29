/**
 * Tap Payments API Client for Saudi Market
 *
 * Official Docs: https://developers.tap.company/reference
 *
 * Features:
 * - Create payment charges
 * - Process card payments
 * - Handle Apple Pay / Mada / STC Pay
 * - Webhook verification
 * - Refunds and partial refunds
 *
 * Environment Variables Required:
 * - TAP_SECRET_KEY: Your Tap secret API key
 * - TAP_PUBLIC_KEY: Your Tap publishable key
 * - TAP_WEBHOOK_SECRET: Webhook signing secret
 */

import crypto from "crypto";
import { logger } from "@/lib/logger";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface TapCustomer {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone?: {
    country_code: string;
    number: string;
  };
}

export interface TapAddress {
  country?: string;
  line1?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

export interface TapSource {
  id: string; // Card token or source ID
}

export interface TapRedirect {
  url: string; // Where to redirect after payment
}

export interface TapPost {
  url: string; // Webhook endpoint
}

export interface TapMetadata {
  orderId?: string;
  userId?: string;
  organizationId?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface TapChargeRequest {
  amount: number; // Amount in smallest currency unit (halalas for SAR)
  currency: string; // "SAR" for Saudi Riyal
  customer: TapCustomer;
  source?: TapSource; // Optional: provide saved card token
  redirect: TapRedirect;
  post?: TapPost; // Webhook URL
  description?: string;
  metadata?: TapMetadata;
  reference?: {
    transaction?: string; // Your internal transaction ID
    order?: string; // Your internal order ID
  };
  receipt?: {
    email: boolean; // Send receipt to customer email
    sms: boolean; // Send receipt to customer phone
  };
  billing?: TapAddress;
  shipping?: TapAddress;
}

export interface TapChargeResponse {
  id: string; // Charge ID (chg_xxxx)
  object: "charge";
  live_mode: boolean;
  api_version: string;
  amount: number;
  currency: string;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: {
      country_code: string;
      number: string;
    };
  };
  source: {
    id: string;
    object: string;
    type: string;
    payment_method: string;
    payment_type: string;
  };
  redirect: {
    status: "PENDING" | "COMPLETED" | "FAILED";
    url: string;
  };
  response: {
    code: string;
    message: string;
  };
  transaction: {
    timezone: string;
    created: string;
    url: string;
    expiry: {
      period: number;
      type: string;
    };
    asynchronous: boolean;
  };
  status:
    | "INITIATED"
    | "CAPTURED"
    | "AUTHORIZED"
    | "DECLINED"
    | "CANCELLED"
    | "FAILED";
  metadata?: TapMetadata;
  reference?: {
    transaction?: string;
    order?: string;
  };
}

export interface TapRefundRequest {
  charge_id: string; // Charge ID to refund
  amount?: number; // Optional: partial refund amount (defaults to full)
  currency: string; // Must match original charge currency
  reason?: string;
  metadata?: TapMetadata;
  reference?: {
    merchant?: string;
  };
  post?: TapPost;
}

export interface TapRefundResponse {
  id: string; // Refund ID (ref_xxxx)
  object: "refund";
  live_mode: boolean;
  api_version: string;
  amount: number;
  currency: string;
  charge: string; // Original charge ID
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  reason?: string;
  metadata?: TapMetadata;
  response: {
    code: string;
    message: string;
  };
  created: string;
}

export interface TapWebhookEvent {
  id: string; // Event ID
  object: "event";
  live_mode: boolean;
  created: string;
  type: string; // e.g., "charge.created", "charge.captured", "refund.succeeded"
  data: {
    object: TapChargeResponse | TapRefundResponse;
  };
}

export interface TapError {
  errors: Array<{
    code: string;
    description: string;
    parameter?: string;
  }>;
}

// ============================================================================
// Tap Payments Client
// ============================================================================

class TapPaymentsClient {
  private readonly baseUrl = "https://api.tap.company/v2";
  private readonly secretKey: string;
  private readonly publicKey: string;
  private readonly webhookSecret: string;
  private readonly isConfigured: boolean;

  constructor() {
    this.secretKey = process.env.TAP_SECRET_KEY || "";
    this.publicKey = process.env.TAP_PUBLIC_KEY || "";
    this.webhookSecret = process.env.TAP_WEBHOOK_SECRET || "";
    const paytabsConfigured =
      Boolean(process.env.PAYTABS_PROFILE_ID) &&
      Boolean(process.env.PAYTABS_SERVER_KEY);
    const tapEnvPresent =
      Boolean(this.secretKey) ||
      Boolean(this.publicKey) ||
      Boolean(this.webhookSecret);
    this.isConfigured = tapEnvPresent;

    // Suppress Tap warnings when PayTabs is configured and Tap is intentionally absent.
    if (!tapEnvPresent) {
      if (!paytabsConfigured) {
        logger.warn(
          "Tap Payments not configured and PayTabs not configured; payment routes will be disabled until one provider is set",
        );
      }
      return;
    }

    if (!this.secretKey) {
      logger.error("TAP_SECRET_KEY environment variable not set");
    }
    if (!this.publicKey) {
      logger.warn(
        "TAP_PUBLIC_KEY environment variable not set (required for frontend)",
      );
    }
    if (!this.webhookSecret) {
      logger.warn(
        "TAP_WEBHOOK_SECRET environment variable not set (webhook verification disabled)",
      );
    }
  }

  private ensureConfigured(action: string) {
    if (!this.isConfigured) {
      throw new Error(
        `Tap Payments is not configured (${action}). Set TAP_SECRET_KEY and TAP_PUBLIC_KEY or use PayTabs instead.`,
      );
    }
  }

  /**
   * Get public key for frontend card tokenization
   */
  getPublicKey(): string {
    this.ensureConfigured("public key lookup");
    return this.publicKey;
  }

  /**
   * Create a payment charge
   * @param request - Charge creation parameters
   * @returns Charge response with transaction URL
   */
  async createCharge(request: TapChargeRequest): Promise<TapChargeResponse> {
    this.ensureConfigured("create charge");
    try {
      logger.info("Creating Tap payment charge", {
        amount: request.amount,
        currency: request.currency,
        customerEmail: request.customer.email,
      });

      const response = await fetch(`${this.baseUrl}/charges`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as TapError;
        logger.error(
          "Tap API error creating charge",
          new Error(JSON.stringify(error)),
        );
        throw new Error(
          error.errors?.map((e) => e.description).join(", ") ||
            "Failed to create charge",
        );
      }

      logger.info("Tap charge created successfully", {
        chargeId: data.id,
        status: data.status,
        transactionUrl: data.transaction.url,
      });

      return data as TapChargeResponse;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Error creating Tap charge", error as Error);
      throw error;
    }
  }

  /**
   * Retrieve a charge by ID
   * @param chargeId - Charge ID (chg_xxxx)
   * @returns Charge details
   */
  async getCharge(chargeId: string): Promise<TapChargeResponse> {
    this.ensureConfigured("get charge");
    try {
      const response = await fetch(`${this.baseUrl}/charges/${chargeId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as TapError;
        logger.error(
          "Tap API error retrieving charge",
          new Error(JSON.stringify(error)),
          { chargeId },
        );
        throw new Error(
          error.errors?.map((e) => e.description).join(", ") ||
            "Failed to retrieve charge",
        );
      }

      return data as TapChargeResponse;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Error retrieving Tap charge", error as Error, { chargeId });
      throw error;
    }
  }

  /**
   * Create a refund for a charge
   * @param request - Refund parameters
   * @returns Refund response
   */
  async createRefund(request: TapRefundRequest): Promise<TapRefundResponse> {
    this.ensureConfigured("create refund");
    try {
      logger.info("Creating Tap refund", {
        chargeId: request.charge_id,
        amount: request.amount,
        reason: request.reason,
      });

      const response = await fetch(`${this.baseUrl}/refunds`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as TapError;
        logger.error(
          "Tap API error creating refund",
          new Error(JSON.stringify(error)),
        );
        throw new Error(
          error.errors?.map((e) => e.description).join(", ") ||
            "Failed to create refund",
        );
      }

      logger.info("Tap refund created successfully", {
        refundId: data.id,
        status: data.status,
      });

      return data as TapRefundResponse;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Error creating Tap refund", error as Error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   * @param payload - Raw webhook payload (as string)
   * @param signature - X-Tap-Signature header value
   * @returns True if signature is valid
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    this.ensureConfigured("verify webhook signature");
    if (!this.webhookSecret) {
      logger.warn(
        "Webhook signature verification skipped - TAP_WEBHOOK_SECRET not configured",
      );
      return true; // Allow in dev/test environments
    }

    try {
      const hmac = crypto.createHmac("sha256", this.webhookSecret);
      const calculatedSignature = hmac.update(payload).digest("hex");

      const isValid = calculatedSignature === signature;

      if (!isValid) {
        logger.error(
          "Invalid webhook signature",
          new Error("Signature mismatch"),
          {
            provided: signature,
            calculated: calculatedSignature,
          },
        );
      }

      return isValid;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Error verifying webhook signature", error as Error);
      return false;
    }
  }

  /**
   * Parse and validate webhook event
   * @param payload - Raw webhook payload (as string)
   * @param signature - X-Tap-Signature header value
   * @returns Parsed webhook event
   * @throws Error if signature is invalid
   */
  parseWebhookEvent(payload: string, signature: string): TapWebhookEvent {
    this.ensureConfigured("parse webhook event");
    if (!this.verifyWebhookSignature(payload, signature)) {
      throw new Error("Invalid webhook signature");
    }

    try {
      const event = JSON.parse(payload) as TapWebhookEvent;
      logger.info("Parsed Tap webhook event", {
        eventId: event.id,
        eventType: event.type,
        liveMode: event.live_mode,
      });
      return event;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Error parsing webhook payload", { error });
      throw new Error("Invalid webhook payload");
    }
  }

  /**
   * Convert SAR to halalas (smallest currency unit)
   * 1 SAR = 100 halalas
   */
  sarToHalalas(amountSAR: number): number {
    return Math.round(amountSAR * 100);
  }

  /**
   * Convert halalas to SAR
   */
  halalasToSAR(amountHalalas: number): number {
    return amountHalalas / 100;
  }

  /**
   * Format amount for display
   * @param amountHalalas - Amount in halalas
   * @param locale - Locale for formatting (default: 'ar-SA')
   * @returns Formatted amount string (e.g., "١٢٫٥٠ ر.س")
   */
  formatAmount(amountHalalas: number, locale: string = "ar-SA"): string {
    const amountSAR = this.halalasToSAR(amountHalalas);
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amountSAR);
  }
}

// Export singleton instance
export const tapPayments = new TapPaymentsClient();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build Tap customer object from user data
 */
export function buildTapCustomer(user: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}): TapCustomer {
  const customer: TapCustomer = {
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
  };

  // Parse phone number if provided (expects format: +966501234567)
  if (user.phone) {
    const phoneMatch = user.phone.match(/^\+(\d{1,3})(\d+)$/);
    if (phoneMatch) {
      customer.phone = {
        country_code: `+${phoneMatch[1]}`,
        number: phoneMatch[2],
      };
    }
  }

  return customer;
}

/**
 * Build redirect URLs for payment flow
 */
export function buildRedirectUrls(
  baseUrl: string,
  successPath: string = "/payments/success",
  _errorPath: string = "/payments/error",
): TapRedirect {
  // Tap requires a single redirect URL - we'll handle success/error via query params
  return {
    url: `${baseUrl}${successPath}`,
  };
}

/**
 * Build webhook configuration
 */
export function buildWebhookConfig(baseUrl: string): TapPost {
  return {
    url: `${baseUrl}/api/payments/tap/webhook`,
  };
}

/**
 * Check if charge is successful
 */
export function isChargeSuccessful(charge: TapChargeResponse): boolean {
  return charge.status === "CAPTURED" || charge.status === "AUTHORIZED";
}

/**
 * Check if charge is pending
 */
export function isChargePending(charge: TapChargeResponse): boolean {
  return charge.status === "INITIATED";
}

/**
 * Check if charge failed
 */
export function isChargeFailed(charge: TapChargeResponse): boolean {
  return (
    charge.status === "DECLINED" ||
    charge.status === "CANCELLED" ||
    charge.status === "FAILED"
  );
}

/**
 * Get user-friendly status message
 */
export function getChargeStatusMessage(
  charge: TapChargeResponse,
  locale: "ar" | "en" = "ar",
): string {
  const messages = {
    ar: {
      CAPTURED: "تمت العملية بنجاح",
      AUTHORIZED: "تم التفويض بنجاح",
      INITIATED: "قيد المعالجة",
      DECLINED: "تم الرفض",
      CANCELLED: "تم الإلغاء",
      FAILED: "فشلت العملية",
    },
    en: {
      CAPTURED: "Payment successful",
      AUTHORIZED: "Payment authorized",
      INITIATED: "Payment pending",
      DECLINED: "Payment declined",
      CANCELLED: "Payment cancelled",
      FAILED: "Payment failed",
    },
  };

  return messages[locale][charge.status] || charge.status;
}
