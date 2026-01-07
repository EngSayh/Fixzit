/**
 * WalletTransaction Model - Transaction log for digital wallets
 * 
 * @module server/models/souq/WalletTransaction
 * @description Immutable transaction log for wallet operations in Fixzit Souq Phase 2.
 * Tracks all credits, debits, and their sources.
 * 
 * @features
 * - Multi-tenant isolation per organization
 * - Immutable records (insert-only, no updates)
 * - Reference tracking to source entities
 * - Transaction categorization
 * - Arabic descriptions for UI
 * 
 * @indexes
 * - { org_id, wallet_id, created_at } - Transaction history queries
 * - { reference_type, reference_id } - Source entity lookups
 * 
 * @compliance
 * - Immutable for audit trail
 * - ZATCA-ready for tax reporting
 */

import { Schema, Types, Document } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const TransactionType = {
  CREDIT: "credit",
  DEBIT: "debit",
} as const;

export const TransactionCategory = {
  TOP_UP: "top_up",
  AD_FEE: "ad_fee",
  SUBSCRIPTION: "subscription",
  REFUND: "refund",
  WITHDRAWAL: "withdrawal",
  COMMISSION: "commission",
  BONUS: "bonus",
  SERVICE_FEE: "service_fee",
} as const;

export const TransactionStatus = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export const PaymentChannel = {
  MADA: "mada",
  VISA: "visa",
  MASTERCARD: "mastercard",
  APPLE_PAY: "apple_pay",
  BANK_TRANSFER: "bank_transfer",
} as const;

export type TransactionTypeValue = (typeof TransactionType)[keyof typeof TransactionType];
export type TransactionCategoryValue = (typeof TransactionCategory)[keyof typeof TransactionCategory];
export type TransactionStatusValue = (typeof TransactionStatus)[keyof typeof TransactionStatus];
export type PaymentChannelValue = (typeof PaymentChannel)[keyof typeof PaymentChannel];

// ============================================================================
// INTERFACES
// ============================================================================

export interface IWalletTransaction extends Document {
  org_id: Types.ObjectId;
  wallet_id: Types.ObjectId;
  user_id?: Types.ObjectId;
  type: TransactionTypeValue;
  amount: number; // In halalas
  description: string;
  description_ar: string;
  category: TransactionCategoryValue;
  reference?: string;
  reference_type?: "subscription" | "listing" | "contract" | "order" | "refund" | "payout";
  reference_id?: Types.ObjectId;
  status: TransactionStatusValue;
  payment_method?: PaymentChannelValue;
  balance_before: number;
  balance_after: number;
  metadata?: Record<string, unknown>;
  created_at: Date;
  
  // Gateway details
  gateway?: string;
  gateway_reference?: string;
}

// ============================================================================
// SCHEMA
// ============================================================================

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    org_id: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    wallet_id: {
      type: Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(TransactionType),
    },
    amount: {
      type: Number,
      required: true,
      min: [1, "Transaction amount must be positive"],
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    description_ar: {
      type: String,
      required: true,
      maxlength: 500,
    },
    category: {
      type: String,
      required: true,
      enum: Object.values(TransactionCategory),
    },
    reference: {
      type: String,
      sparse: true,
    },
    reference_type: {
      type: String,
      enum: ["subscription", "listing", "contract", "order", "refund", "payout"],
    },
    reference_id: {
      type: Schema.Types.ObjectId,
    },
    status: {
      type: String,
      required: true,
      default: TransactionStatus.PENDING,
      enum: Object.values(TransactionStatus),
    },
    payment_method: {
      type: String,
      enum: Object.values(PaymentChannel),
    },
    balance_before: {
      type: Number,
      required: true,
    },
    balance_after: {
      type: Number,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    gateway: {
      type: String,
      sparse: true,
    },
    gateway_reference: {
      type: String,
      sparse: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: false, // Immutable - no updates
    },
    collection: "wallet_transactions",
  }
);

// ============================================================================
// INDEXES
// ============================================================================

// Transaction history queries
WalletTransactionSchema.index({ org_id: 1, wallet_id: 1, created_at: -1 });

// Category filtering
WalletTransactionSchema.index({ org_id: 1, category: 1, created_at: -1 });

// Status filtering
WalletTransactionSchema.index({ org_id: 1, status: 1 });

// ============================================================================
// PLUGINS
// ============================================================================

WalletTransactionSchema.plugin(tenantIsolationPlugin);

// ============================================================================
// PRE-SAVE HOOKS
// ============================================================================

/**
 * Prevent updates to transactions (immutable)
 */
WalletTransactionSchema.pre("save", function (next) {
  if (!this.isNew) {
    const err = new Error("Wallet transactions are immutable and cannot be modified");
    return next(err);
  }
  next();
});

// ============================================================================
// MODEL EXPORT
// ============================================================================

export const WalletTransaction = getModel<IWalletTransaction>(
  "WalletTransaction",
  WalletTransactionSchema
);
export default WalletTransaction;
