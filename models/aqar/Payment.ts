/**
 * Aqar Souq - Payment Model
 *
 * Payment records for packages, boosts, fees
 * Integration with Fixzit Finance module
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import { getModel, MModel } from "@/src/types/mongoose-compat";

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
  // Atomic update with state precondition to prevent invalid transitions
  // Use this.constructor for consistency with other instance methods
  const result = await (
    this.constructor as typeof mongoose.Model
  ).findOneAndUpdate(
    {
      _id: this._id,
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
  // Atomic update with state precondition to prevent invalid transitions
  // Use this.constructor for consistency with markAsCompleted and to avoid model registration issues
  const PaymentModel = this.constructor as typeof mongoose.Model;
  const result = await PaymentModel.findOneAndUpdate(
    {
      _id: this._id,
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

  const result = await (
    this.constructor as typeof import("mongoose").Model
  ).findOneAndUpdate(
    {
      _id: this._id,
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

const Payment = getModel<IPayment>("AqarPayment", PaymentSchema);

export default Payment;
