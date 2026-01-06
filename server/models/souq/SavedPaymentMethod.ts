/**
 * SavedPaymentMethod Model - Tokenized payment methods for wallets
 * 
 * @module server/models/souq/SavedPaymentMethod
 * @description Stores tokenized payment methods (cards, bank accounts) for recurring payments.
 * No raw card data stored - only gateway tokens.
 * 
 * @features
 * - Multi-tenant isolation per organization
 * - Token-based storage (PCI-DSS compliant)
 * - Support for Mada, Visa, MasterCard
 * - Default payment method selection
 * - Expiry tracking and cleanup
 * 
 * @indexes
 * - { org_id, user_id } - User's payment methods
 * - { token } - Gateway token lookup
 * 
 * @compliance
 * - PCI-DSS: No raw card numbers stored
 * - Only last 4 digits for display
 * - Encrypted tokens at rest
 */

import { Schema, model, models, Types, Document } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";
import { auditPlugin } from "@/server/plugins/auditPlugin";
import { encryptionPlugin } from "@/server/plugins/encryptionPlugin";

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const PaymentMethodType = {
  MADA: "mada",
  VISA: "visa",
  MASTERCARD: "mastercard",
  APPLE_PAY: "apple_pay",
} as const;

export const PaymentMethodStatus = {
  ACTIVE: "active",
  EXPIRED: "expired",
  DELETED: "deleted",
} as const;

export type PaymentMethodTypeValue = (typeof PaymentMethodType)[keyof typeof PaymentMethodType];
export type PaymentMethodStatusValue = (typeof PaymentMethodStatus)[keyof typeof PaymentMethodStatus];

// ============================================================================
// INTERFACES
// ============================================================================

export interface ISavedPaymentMethod extends Document {
  org_id: Types.ObjectId;
  user_id: Types.ObjectId;
  card_type: PaymentMethodTypeValue;
  type?: PaymentMethodTypeValue; // Alias for card_type
  last_four: string;
  expiry_month: string;
  expiry_year: string;
  card_holder_name?: string;
  token: string; // Encrypted payment gateway token
  is_default: boolean;
  is_active: boolean;
  status: PaymentMethodStatusValue;
  
  // Gateway details
  gateway: "tap" | "hyperpay" | "moyasar";
  gateway_customer_id?: string;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
  last_used_at?: Date;
  
  // Audit fields
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

// ============================================================================
// SCHEMA
// ============================================================================

const SavedPaymentMethodSchema = new Schema<ISavedPaymentMethod>(
  {
    org_id: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    card_type: {
      type: String,
      required: true,
      enum: Object.values(PaymentMethodType),
    },
    last_four: {
      type: String,
      required: true,
      match: [/^\d{4}$/, "Last four must be 4 digits"],
    },
    expiry_month: {
      type: String,
      required: true,
      match: [/^(0[1-9]|1[0-2])$/, "Invalid expiry month"],
    },
    expiry_year: {
      type: String,
      required: true,
      match: [/^\d{4}$/, "Invalid expiry year"],
    },
    card_holder_name: {
      type: String,
      maxlength: 100,
    },
    token: {
      type: String,
      required: true,
      // Encrypted by encryptionPlugin
    },
    is_default: {
      type: Boolean,
      default: false,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      required: true,
      default: PaymentMethodStatus.ACTIVE,
      enum: Object.values(PaymentMethodStatus),
    },
    gateway: {
      type: String,
      required: true,
      enum: ["tap", "hyperpay", "moyasar"],
      default: "tap",
    },
    gateway_customer_id: {
      type: String,
    },
    last_used_at: {
      type: Date,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "saved_payment_methods",
  }
);

// ============================================================================
// INDEXES
// ============================================================================

// User's payment methods
SavedPaymentMethodSchema.index({ org_id: 1, user_id: 1, status: 1 });

// Default payment method lookup
SavedPaymentMethodSchema.index({ org_id: 1, user_id: 1, is_default: 1 });

// Token lookup (for gateway callbacks)
SavedPaymentMethodSchema.index({ token: 1 }, { sparse: true });

// Cleanup expired cards
SavedPaymentMethodSchema.index({ expiry_year: 1, expiry_month: 1, status: 1 });

// ============================================================================
// PLUGINS
// ============================================================================

SavedPaymentMethodSchema.plugin(tenantIsolationPlugin);
SavedPaymentMethodSchema.plugin(auditPlugin);
SavedPaymentMethodSchema.plugin(encryptionPlugin, { fields: { token: "Payment Token" } });

// ============================================================================
// VIRTUALS
// ============================================================================

/**
 * Check if card is expired
 */
SavedPaymentMethodSchema.virtual("isExpired").get(function () {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  const cardYear = parseInt(this.expiry_year, 10);
  const cardMonth = parseInt(this.expiry_month, 10);
  
  if (cardYear < currentYear) return true;
  if (cardYear === currentYear && cardMonth < currentMonth) return true;
  return false;
});

/**
 * Display name for UI
 */
SavedPaymentMethodSchema.virtual("displayName").get(function () {
  const typeLabels: Record<string, string> = {
    mada: "Mada",
    visa: "Visa",
    mastercard: "Mastercard",
    apple_pay: "Apple Pay",
  };
  const cardType = this.card_type ?? "card";
  return `${typeLabels[cardType] || cardType} •••• ${this.last_four}`;
});

// ============================================================================
// PRE-SAVE HOOKS
// ============================================================================

/**
 * Ensure only one default payment method per user
 */
SavedPaymentMethodSchema.pre("save", async function (next) {
  if (this.is_default && this.isModified("is_default")) {
    // Remove default from other payment methods
    await this.model("SavedPaymentMethod").updateMany(
      {
        org_id: this.org_id,
        user_id: this.user_id,
        _id: { $ne: this._id },
        is_default: true,
      },
      { $set: { is_default: false } }
    );
  }
  next();
});

// ============================================================================
// STATICS
// ============================================================================

/**
 * Get user's active payment methods
 */
SavedPaymentMethodSchema.statics.getActiveForUser = async function (
  org_id: Types.ObjectId | string,
  user_id: Types.ObjectId | string
): Promise<ISavedPaymentMethod[]> {
  return this.find({
    org_id,
    user_id,
    status: PaymentMethodStatus.ACTIVE,
  }).sort({ is_default: -1, created_at: -1 });
};

/**
 * Get default payment method for user
 */
SavedPaymentMethodSchema.statics.getDefaultForUser = async function (
  org_id: Types.ObjectId | string,
  user_id: Types.ObjectId | string
): Promise<ISavedPaymentMethod | null> {
  return this.findOne({
    org_id,
    user_id,
    is_default: true,
    status: PaymentMethodStatus.ACTIVE,
  });
};

/**
 * Soft delete payment method
 */
SavedPaymentMethodSchema.statics.softDelete = async function (
  org_id: Types.ObjectId | string,
  user_id: Types.ObjectId | string,
  method_id: Types.ObjectId | string
): Promise<ISavedPaymentMethod | null> {
  return this.findOneAndUpdate(
    { org_id, user_id, _id: method_id },
    { $set: { status: PaymentMethodStatus.DELETED, is_default: false } },
    { new: true }
  );
};

// ============================================================================
// MODEL EXPORT
// ============================================================================

export const SavedPaymentMethod = getModel<ISavedPaymentMethod>(
  "SavedPaymentMethod",
  SavedPaymentMethodSchema
);
export default SavedPaymentMethod;
