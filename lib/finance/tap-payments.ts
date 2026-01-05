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
 * Environment Variables (via lib/tapConfig.ts):
 * Server-side:
 * - TAP_TEST_SECRET_KEY / TAP_LIVE_SECRET_KEY
 * - TAP_MERCHANT_ID, TAP_ACCOUNT_ID, TAP_API_KEY
 * - TAP_GOSELL_USERNAME, TAP_GOSELL_PASSWORD
 * - TAP_WEBHOOK_SECRET
 * Client-side:
 * - NEXT_PUBLIC_TAP_TEST_PUBLIC_KEY / NEXT_PUBLIC_TAP_LIVE_PUBLIC_KEY
 * Environment selector:
 * - TAP_ENVIRONMENT: "test" or "live"
 */

import crypto from "crypto";
import { logger } from "@/lib/logger";
import { getTapConfig, assertTapConfig, type TapConfig } from "@/lib/tapConfig";

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
// TAP Transfer API (for marketplace seller payouts)
// ============================================================================

/**
 * Transfer request for marketplace payouts
 * @see https://developers.tap.company/reference/create-a-transfer
 */
export interface TapTransferRequest {
  amount: number; // Amount in smallest currency unit (halalas)
  currency: string; // "SAR"
  destination: {
    id: string; // Destination ID (merchant/seller ID in TAP)
  };
  description?: string;
  metadata?: TapMetadata;
  reference?: {
    merchant?: string; // Your internal reference
  };
}

export interface TapTransferResponse {
  id: string; // Transfer ID (tr_xxxx)
  object: "transfer";
  live_mode: boolean;
  api_version: string;
  amount: number;
  currency: string;
  destination: {
    id: string;
    object: string;
  };
  // [AGENT-0008] PR Review: Status values per TAP Transfer API docs
  // @see https://developers.tap.company/reference/retrieve-a-transfer
  status: "PENDING" | "INITIATED" | "FAILED" | "PAID_OUT";
  description?: string;
  metadata?: TapMetadata;
  response: {
    code: string;
    message: string;
  };
  created: string;
}

/**
 * Destination (seller) registration request
 * @see https://developers.tap.company/docs/destinations
 */
export interface TapDestinationRequest {
  display_name: string;
  bank_account: {
    iban: string;
  };
  settlement_by?: "Acquirer" | "Merchant";
}

export interface TapDestinationResponse {
  id: string; // Destination ID for transfers
  status: "Active" | "Inactive" | "Pending";
  created: number;
  object: "merchant";
  live_mode: boolean;
  display_name: string;
  bank_account: {
    id: string;
    status: string;
    iban: string;
  };
  settlement_by: string;
}

// ============================================================================
// Tap Payments Client
// ============================================================================

class TapPaymentsClient {
  private readonly baseUrl = "https://api.tap.company/v2";
  private config: TapConfig;

  constructor() {
    // Load configuration from central tapConfig helper
    this.config = getTapConfig();
    
    // Check if TAP is configured
    const tapEnvPresent = Boolean(this.config.secretKey) || Boolean(this.config.publicKey);
    if (!tapEnvPresent) {
      logger.warn(
        "TAP Payments not configured; payment routes will be disabled until TAP credentials are set",
      );
      return;
    }

    // Warn if partially configured (one key present but not both)
    if (!this.config.isConfigured) {
      const envType = this.config.environment === "live" 
        ? "TAP_LIVE_SECRET_KEY/NEXT_PUBLIC_TAP_LIVE_PUBLIC_KEY" 
        : "TAP_TEST_SECRET_KEY/NEXT_PUBLIC_TAP_TEST_PUBLIC_KEY";
      logger.error(
        `TAP Payments partially configured: ${envType} required for API access (environment: ${this.config.environment})`,
      );
    }
    
    if (!this.config.webhookSecret) {
      logger.warn(
        "TAP_WEBHOOK_SECRET environment variable not set (webhook verification disabled)",
      );
    }
  }

  /**
   * Refresh configuration (useful if env vars change at runtime)
   */
  refreshConfig() {
    this.config = getTapConfig();
  }

  private ensureConfigured(action: string) {
    if (!this.config.isConfigured) {
      // Use assertTapConfig for detailed error message
      assertTapConfig(action);
    }
  }

  /**
   * Get public key for frontend card tokenization
   */
  getPublicKey(): string {
    this.ensureConfigured("public key lookup");
    return this.config.publicKey;
  }

  /**
   * Get current environment (test or live)
   */
  getEnvironment(): "test" | "live" {
    return this.config.environment;
  }

  /**
   * Check if running in production/live mode
   */
  isLiveMode(): boolean {
    return this.config.isProd;
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
          Authorization: `Bearer ${this.config.secretKey}`,
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
    // SEC-SSRF-001: Validate chargeId format to prevent SSRF attacks
    if (!/^chg_[a-zA-Z0-9_]+$/.test(chargeId)) {
      throw new Error("Invalid charge ID format");
    }
    try {
      const response = await fetch(`${this.baseUrl}/charges/${chargeId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.secretKey}`,
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
          Authorization: `Bearer ${this.config.secretKey}`,
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
   * Retrieve a refund by ID
   * @param refundId - Refund ID (ref_xxxx)
   * @returns Refund details
   */
  async getRefund(refundId: string): Promise<TapRefundResponse> {
    this.ensureConfigured("get refund");
    // SEC-SSRF-002: Validate refundId format to prevent SSRF attacks
    if (!/^re[fp]_[a-zA-Z0-9_]+$/.test(refundId)) {
      throw new Error("Invalid refund ID format");
    }
    try {
      const response = await fetch(`${this.baseUrl}/refunds/${refundId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.secretKey}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as TapError;
        logger.error(
          "Tap API error retrieving refund",
          new Error(JSON.stringify(error)),
        );
        throw new Error(
          error.errors?.map((e) => e.description).join(", ") ||
            "Failed to retrieve refund",
        );
      }

      return data as TapRefundResponse;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      void error;
      logger.error("Error retrieving Tap refund", error as Error);
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
    if (!this.config.webhookSecret) {
      logger.warn(
        "Webhook signature verification skipped - TAP_WEBHOOK_SECRET not configured",
      );
      return true; // Allow in dev/test environments
    }

    try {
      const hmac = crypto.createHmac("sha256", this.config.webhookSecret);
      const calculatedSignature = hmac.update(payload).digest("hex");

      // SEC-TAP-001: Use timing-safe comparison to prevent timing attacks
      // Both signatures must be same length for timingSafeEqual
      const calcBuffer = Buffer.from(calculatedSignature, "hex");
      const sigBuffer = Buffer.from(signature, "hex");

      // Length check first (not timing-sensitive since attacker controls signature)
      if (calcBuffer.length !== sigBuffer.length) {
        logger.error(
          "Invalid webhook signature",
          new Error("Signature length mismatch"),
          {
            providedLength: sigBuffer.length,
            expectedLength: calcBuffer.length,
          },
        );
        return false;
      }

      const isValid = crypto.timingSafeEqual(calcBuffer, sigBuffer);

      if (!isValid) {
        logger.error(
          "Invalid webhook signature",
          new Error("Signature mismatch"),
          {
            // Don't log actual signatures in production to avoid leaking info
            signatureProvided: true,
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

  // =========================================================================
  // TAP Transfer API (for marketplace seller payouts)
  // =========================================================================

  /**
   * Create a transfer to a destination (seller payout)
   * @param request - Transfer parameters
   * @returns Transfer response
   */
  async createTransfer(request: TapTransferRequest): Promise<TapTransferResponse> {
    this.ensureConfigured("create transfer");
    try {
      logger.info("Creating TAP transfer (seller payout)", {
        amount: request.amount,
        currency: request.currency,
        destinationId: request.destination.id,
        reference: request.reference?.merchant,
      });

      const response = await fetch(`${this.baseUrl}/transfers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as TapError;
        logger.error(
          "TAP API error creating transfer",
          new Error(JSON.stringify(error)),
        );
        throw new Error(
          error.errors?.map((e) => e.description).join(", ") ||
            "Failed to create transfer",
        );
      }

      logger.info("TAP transfer created successfully", {
        transferId: data.id,
        status: data.status,
        amount: data.amount,
      });

      return data as TapTransferResponse;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      logger.error("Error creating TAP transfer", error as Error);
      throw error;
    }
  }

  /**
   * Retrieve a transfer by ID
   * @param transferId - Transfer ID (tr_xxxx)
   * @returns Transfer details
   */
  async getTransfer(transferId: string): Promise<TapTransferResponse> {
    this.ensureConfigured("get transfer");
    // SEC-SSRF-003: Validate transferId format to prevent SSRF attacks
    if (!/^tr_[a-zA-Z0-9_]+$/.test(transferId)) {
      throw new Error("Invalid transfer ID format");
    }
    try {
      const response = await fetch(`${this.baseUrl}/transfers/${transferId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.secretKey}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as TapError;
        logger.error(
          "TAP API error retrieving transfer",
          new Error(JSON.stringify(error)),
          { transferId },
        );
        throw new Error(
          error.errors?.map((e) => e.description).join(", ") ||
            "Failed to retrieve transfer",
        );
      }

      return data as TapTransferResponse;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      logger.error("Error retrieving TAP transfer", error as Error, { transferId });
      throw error;
    }
  }

  /**
   * Create or register a destination (seller) for receiving transfers
   * @param request - Destination parameters
   * @returns Destination details with ID for transfers
   */
  async createDestination(request: TapDestinationRequest): Promise<TapDestinationResponse> {
    this.ensureConfigured("create destination");
    try {
      logger.info("Creating TAP destination (seller registration)", {
        displayName: request.display_name,
        iban: request.bank_account.iban.substring(0, 4) + "****",
      });

      const response = await fetch(`${this.baseUrl}/destinations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as TapError;
        logger.error(
          "TAP API error creating destination",
          new Error(JSON.stringify(error)),
        );
        throw new Error(
          error.errors?.map((e) => e.description).join(", ") ||
            "Failed to create destination",
        );
      }

      logger.info("TAP destination created successfully", {
        destinationId: data.id,
        status: data.status,
      });

      return data as TapDestinationResponse;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      logger.error("Error creating TAP destination", error as Error);
      throw error;
    }
  }

  /**
   * Retrieve a destination by ID
   * @param destinationId - Destination ID
   * @returns Destination details
   */
  async getDestination(destinationId: string): Promise<TapDestinationResponse> {
    this.ensureConfigured("get destination");
    // SEC-SSRF-004: Validate destinationId format to prevent SSRF attacks
    if (!/^dst_[a-zA-Z0-9_]+$/.test(destinationId)) {
      throw new Error("Invalid destination ID format");
    }
    try {
      const response = await fetch(`${this.baseUrl}/destinations/${destinationId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.secretKey}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as TapError;
        logger.error(
          "TAP API error retrieving destination",
          new Error(JSON.stringify(error)),
          { destinationId },
        );
        throw new Error(
          error.errors?.map((e) => e.description).join(", ") ||
            "Failed to retrieve destination",
        );
      }

      return data as TapDestinationResponse;
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      logger.error("Error retrieving TAP destination", error as Error, { destinationId });
      throw error;
    }
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
