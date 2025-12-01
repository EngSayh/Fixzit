/**
 * Aqar Souq - Payment Model
 *
 * Payment records for packages, boosts, fees
 * Integration with Fixzit Finance module
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import { getModel, MModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";

export enum PaymentType {
  PACKAGE = "PACKAGE", // Listing package
  BOOST = "BOOST", // Listing boost
  LISTING_FEE = "LISTING_FEE", // 999 SAR SALE, 199 SAR RENT/DAILY
  EJAR_FEE = "EJAR_FEE", // 299 SAR single, 499 SAR multiple
  PLATFORM_FEE = "PLATFORM_FEE", // Booking platform fee (15%)
}

export enum PaymentStatus {
  PENDING = "PENDING", // Awaiting payment
  PROCESSING = "PROCESSING", // Payment in progress
  COMPLETED = "COMPLETED", // Payment successful
  FAILED = "FAILED", // Payment failed
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED", // Partially refunded
  REFUNDED = "REFUNDED", // Fully refunded
}

export enum PaymentMethod {
  CREDIT_CARD = "CREDIT_CARD",
  MADA = "MADA", // KSA domestic cards
  APPLE_PAY = "APPLE_PAY",
  STC_PAY = "STC_PAY", // KSA mobile wallet
}

export interface IPayment extends Document {
  // User
  userId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;

  // Payment details
  type: PaymentType;
  amount: number; // SAR
  currency: string; // SAR

  // Related entity
  relatedId?: mongoose.Types.ObjectId; // Package/Boost/Listing/Booking ID
  relatedModel?: string; // 'AqarPackage', 'AqarBoost', etc.

  // Status
  status: PaymentStatus;

  // Payment method
  method?: PaymentMethod;

  // Gateway response
  gatewayTransactionId?: string;
  gatewayResponse?: Record<string, unknown>;

  // Timestamps
  paidAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
  refundAmount?: number; // SAR - preserved original amount

  // Integration
  invoiceId?: mongoose.Types.ObjectId; // Link to Finance Invoice

  // Failure tracking
  failureReason?: string;
  lastError?: string;

  // ZATCA compliance (Saudi Arabia e-invoicing)
  zatca?: {
    complianceStatus?: "NOT_REQUIRED" | "PENDING_RETRY" | "CLEARED" | "FAILED";
    lastRetryAt?: Date;
    lastRetryError?: string;
    retryAttempts?: number;
    lastAttemptAt?: Date;
    qrCode?: string;
    invoiceHash?: string;
    clearanceId?: string;
    clearedAt?: Date;
    retryCompletedAt?: Date;
    // Evidence fields for compliance audit trail
    lastError?: string;
    submittedAt?: Date;
    invoicePayload?: Record<string, unknown>;
  };

  // Metadata
  metadata?: Record<string, unknown>;
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: Object.values(PaymentType),
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "SAR", required: true },

    relatedId: { type: Schema.Types.ObjectId, index: true },
    relatedModel: {
      type: String,
      enum: ["AqarPackage", "AqarBoost", "AqarListing", "Booking"], // Explicit allowed values
    },

    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      required: true,
    },

    method: {
      type: String,
      enum: Object.values(PaymentMethod),
    },

    gatewayTransactionId: { type: String },
    // Sensitive: Gateway response may contain PII, tokens, or internal gateway data
    // Use select: false to prevent accidental exposure in queries
    gatewayResponse: { type: Schema.Types.Mixed, select: false },

    paidAt: { type: Date },
    failedAt: { type: Date },
    refundedAt: { type: Date },
    refundAmount: { type: Number, min: 0, default: null },

    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },

    // Failure tracking
    failureReason: { type: String },
    lastError: { type: String },

    // ZATCA compliance (Saudi Arabia e-invoicing)
    zatca: {
      complianceStatus: {
        type: String,
        enum: ["NOT_REQUIRED", "PENDING_RETRY", "CLEARED", "FAILED"],
        index: true,
      },
      lastRetryAt: { type: Date },
      lastRetryError: { type: String },
      retryAttempts: { type: Number, default: 0 },
      lastAttemptAt: { type: Date },
      qrCode: { type: String },
      invoiceHash: { type: String },
      clearanceId: { type: String },
      clearedAt: { type: Date },
      retryCompletedAt: { type: Date },
      // Evidence fields for compliance audit trail (written by PayTabs callback)
      lastError: { type: String },
      submittedAt: { type: Date },
      // Sensitive: Invoice payload may contain business details
      // Use select: false to prevent accidental exposure in queries
      invoicePayload: { type: Schema.Types.Mixed, select: false },
    },

    // Sensitive: Metadata may contain internal notes, debugging info, or PII
    // Use select: false to prevent accidental exposure in queries
    metadata: { type: Schema.Types.Mixed, select: false },
  },
  {
    timestamps: true,
    collection: "aqar_payments",
  },
);

// Indexes (compound index covers status queries)
PaymentSchema.index({ userId: 1, status: 1, createdAt: -1 });
PaymentSchema.index({ gatewayTransactionId: 1 });
// ZATCA retry query index: supports scanAndEnqueuePendingRetries() in jobs/zatca-retry-queue.ts
PaymentSchema.index({ orgId: 1, "zatca.complianceStatus": 1, "zatca.lastRetryAt": 1 });

// =============================================================================
// LEGACY SUPPORT: org_id alias for backward compatibility
// Some older payment records may use org_id instead of orgId. This virtual
// allows queries and updates using org_id to work transparently.
// =============================================================================
PaymentSchema.virtual("org_id")
  .get(function (this: IPayment) {
    return this.orgId;
  })
  .set(function (this: IPayment, value: mongoose.Types.ObjectId) {
    this.orgId = value;
  });

// Enable virtuals in JSON/Object output for API responses
PaymentSchema.set("toJSON", { virtuals: true });
PaymentSchema.set("toObject", { virtuals: true });
// Legacy org_id index: covers $or queries for documents with org_id field
// Required until all legacy documents are migrated to orgId
PaymentSchema.index({ org_id: 1, "zatca.complianceStatus": 1, "zatca.lastRetryAt": 1 });

// Static: Get standard fees
PaymentSchema.statics.getStandardFees = function () {
  return {
    SALE_LISTING: 999, // SAR
    RENT_LISTING: 199, // SAR
    DAILY_LISTING: 199, // SAR
    EJAR_SINGLE: 299, // SAR
    EJAR_MULTIPLE: 499, // SAR
    BOOKING_PLATFORM_FEE: 0.15, // 15%
  };
};

// Methods

/**
 * Scrub sensitive data from gatewayResponse for safe logging/display
 * Removes PII, tokens, and internal gateway details
 * Note: Currently does shallow scrubbing (depth 1). Nested objects shown as '[OBJECT]'
 * to prevent accidental leakage. For full recursive scrubbing, implement depth-limited recursion.
 */
PaymentSchema.methods.getSafeGatewayResponse = function (
  this: IPayment,
): Record<string, unknown> | undefined {
  if (!this.gatewayResponse) return undefined;

  const scrubbed: Record<string, unknown> = {};
  const sensitiveKeys = [
    "card",
    "cardNumber",
    "cvv",
    "pan",
    "token",
    "accessToken",
    "apiKey",
    "customer",
    "email",
    "phone",
    "name",
    "address",
    "ip",
    "userAgent",
    "password",
    "secret",
    "key",
    "authorization",
    "signature",
  ];

  for (const [key, value] of Object.entries(this.gatewayResponse)) {
    const keyLower = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sk) =>
      keyLower.includes(sk.toLowerCase()),
    );

    if (isSensitive) {
      scrubbed[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      // Shallow scrubbing: nested objects replaced with '[OBJECT]' placeholder
      scrubbed[key] = "[OBJECT]";
    } else {
      scrubbed[key] = value;
    }
  }

  return scrubbed;
};

PaymentSchema.methods.markAsCompleted = async function (
  this: IPayment,
  transactionId?: string,
  response?: Record<string, unknown>,
) {
  // SECURITY: Require orgId to prevent cross-tenant mutations even if caller context is missing
  if (!this.orgId) {
    throw new Error("Cannot mark payment as completed: orgId is required for tenant isolation");
  }

  // Atomic update with state precondition to prevent invalid transitions
  // SECURITY: Include orgId in predicate to enforce tenant isolation at data layer
  const result = await (
    this.constructor as typeof mongoose.Model
  ).findOneAndUpdate(
    {
      _id: this._id,
      orgId: this.orgId, // SECURITY: Explicit org scoping
      status: PaymentStatus.PENDING, // Only allow PENDING → COMPLETED
    },
    {
      $set: {
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
        ...(transactionId && { gatewayTransactionId: transactionId }),
        ...(response && { gatewayResponse: response }),
      },
    },
    { new: true },
  );

  if (!result) {
    throw new Error(
      `Cannot mark payment as completed: not in PENDING status (current: ${this.status})`,
    );
  }

  // Update local instance
  this.status = (result as IPayment).status;
  this.paidAt = (result as IPayment).paidAt;
  if (transactionId)
    this.gatewayTransactionId = (result as IPayment).gatewayTransactionId;
  if (response) this.gatewayResponse = (result as IPayment).gatewayResponse;
};

PaymentSchema.methods.markAsFailed = async function (
  this: IPayment,
  response?: Record<string, unknown>,
) {
  // SECURITY: Require orgId to prevent cross-tenant mutations even if caller context is missing
  if (!this.orgId) {
    throw new Error("Cannot mark payment as failed: orgId is required for tenant isolation");
  }

  // Atomic update with state precondition to prevent invalid transitions
  // SECURITY: Include orgId in predicate to enforce tenant isolation at data layer
  const PaymentModel = this.constructor as typeof mongoose.Model;
  const result = await PaymentModel.findOneAndUpdate(
    {
      _id: this._id,
      orgId: this.orgId, // SECURITY: Explicit org scoping
      status: PaymentStatus.PENDING, // Only allow PENDING → FAILED
    },
    {
      $set: {
        status: PaymentStatus.FAILED,
        failedAt: new Date(),
        ...(response && { gatewayResponse: response }),
      },
    },
    { new: true },
  );

  if (!result) {
    throw new Error(
      `Cannot mark payment as failed: not in PENDING status (current: ${this.status})`,
    );
  }

  // Update local instance
  this.status = (result as IPayment).status;
  this.failedAt = (result as IPayment).failedAt;
  if (response) this.gatewayResponse = (result as IPayment).gatewayResponse;
};

PaymentSchema.methods.markAsRefunded = async function (
  this: IPayment,
  refundAmount?: number,
) {
  const actualRefundAmount = refundAmount ?? this.amount;

  // Validate refund amount
  if (actualRefundAmount <= 0 || actualRefundAmount > this.amount) {
    throw new Error(`Refund amount must be between 0 and ${this.amount}`);
  }

  // Atomic update with predicates to prevent race conditions
  const currentRefundAmount = this.refundAmount ?? 0;
  const newTotalRefunded = currentRefundAmount + actualRefundAmount;

  // Validate total before attempting DB update
  if (newTotalRefunded > this.amount) {
    throw new Error(
      `Total refund (${newTotalRefunded}) exceeds payment amount (${this.amount})`,
    );
  }

  const newStatus =
    newTotalRefunded >= this.amount
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIALLY_REFUNDED;

  // SECURITY: Require orgId to prevent cross-tenant mutations even if caller context is missing
  if (!this.orgId) {
    throw new Error("Cannot mark payment as refunded: orgId is required for tenant isolation");
  }

  // SECURITY: Include orgId in predicate to enforce tenant isolation at data layer
  const result = await (
    this.constructor as typeof import("mongoose").Model
  ).findOneAndUpdate(
    {
      _id: this._id,
      orgId: this.orgId, // SECURITY: Explicit org scoping
      status: {
        $in: [PaymentStatus.COMPLETED, PaymentStatus.PARTIALLY_REFUNDED],
      },
      // Ensure we don't exceed refundable amount in the DB query
      $expr: {
        $lte: [
          { $add: [{ $ifNull: ["$refundAmount", 0] }, actualRefundAmount] },
          "$amount",
        ],
      },
    },
    {
      $inc: { refundAmount: actualRefundAmount },
      $set: {
        status: newStatus,
        refundedAt: new Date(),
      },
    },
    { new: true },
  );

  if (!result) {
    // Re-check current state for better error message
    if (
      this.status !== PaymentStatus.COMPLETED &&
      this.status !== PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new Error(
        "Can only refund completed or partially refunded payments",
      );
    }
    throw new Error(
      "Refund failed: concurrent modification or refund amount exceeded",
    );
  }

  // Update in-memory instance
  this.refundAmount = (result as IPayment).refundAmount;
  this.status = (result as IPayment).status;
  this.refundedAt = (result as IPayment).refundedAt;
};

// =============================================================================
// DATA-001 FIX: Apply tenantIsolationPlugin for multi-tenant data isolation
// CRITICAL: Prevents cross-tenant data access in Aqar payments
// =============================================================================
PaymentSchema.plugin(tenantIsolationPlugin);

const Payment = getModel<IPayment>("AqarPayment", PaymentSchema);

export default Payment;
