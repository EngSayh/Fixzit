/**
 * Wallet Model - Digital wallet for Souq marketplace
 * 
 * @module server/models/souq/Wallet
 * @description Digital wallet for Fixzit Souq Phase 2 - holds balance for transactions,
 * subscriptions, and service fees.
 * 
 * @features
 * - Multi-tenant isolation per organization
 * - Balance tracking in halalas (1 SAR = 100 halalas)
 * - Status management (active, frozen, closed)
 * - Integration with payment methods and transactions
 * 
 * @indexes
 * - Unique: { org_id, user_id } - One wallet per user per organization
 * 
 * @compliance
 * - Decimal precision for financial calculations
 * - Audit trail for all balance changes
 * - ZATCA-ready for tax reporting
 */

import { Schema, Types, Document, Model } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";
import { auditPlugin } from "@/server/plugins/auditPlugin";

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const WalletStatus = {
  ACTIVE: "active",
  FROZEN: "frozen",
  CLOSED: "closed",
} as const;

export type WalletStatusType = (typeof WalletStatus)[keyof typeof WalletStatus];

// ============================================================================
// INTERFACES
// ============================================================================

export interface IWallet extends Document {
  org_id: Types.ObjectId;
  user_id: Types.ObjectId;
  balance: number; // In halalas (1 SAR = 100 halalas)
  pending_balance: number;
  currency: string;
  status: WalletStatusType;
  created_at: Date;
  updated_at: Date;
  
  // Audit fields (from plugin)
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  // Instance methods
  credit(amount: number, options?: { session?: unknown }): Promise<IWallet>;
  debit(amount: number, options?: { session?: unknown }): Promise<IWallet>;
  getBalanceInSAR(): number;
}

export interface IWalletModel extends Model<IWallet> {
  findOrCreate(org_id: Types.ObjectId | string, user_id: Types.ObjectId | string): Promise<IWallet>;
}

// ============================================================================
// SCHEMA
// ============================================================================

const WalletSchema = new Schema<IWallet>(
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
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Balance cannot be negative"],
    },
    pending_balance: {
      type: Number,
      default: 0,
      min: [0, "Pending balance cannot be negative"],
    },
    currency: {
      type: String,
      required: true,
      default: "SAR",
      enum: ["SAR", "USD"],
    },
    status: {
      type: String,
      required: true,
      default: WalletStatus.ACTIVE,
      enum: Object.values(WalletStatus),
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "wallets",
  }
);

// ============================================================================
// INDEXES
// ============================================================================

// Unique wallet per user per organization
WalletSchema.index({ org_id: 1, user_id: 1 }, { unique: true });

// Quick lookup by status
WalletSchema.index({ org_id: 1, status: 1 });

// ============================================================================
// PLUGINS
// ============================================================================

WalletSchema.plugin(tenantIsolationPlugin);
WalletSchema.plugin(auditPlugin);

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Credit balance (add funds)
 */
WalletSchema.methods.credit = async function (
  amount: number,
  options?: { session?: unknown }
): Promise<IWallet> {
  if (amount <= 0) {
    throw new Error("Credit amount must be positive");
  }
  this.balance += amount;
  return this.save(options);
};

/**
 * Debit balance (withdraw funds)
 */
WalletSchema.methods.debit = async function (
  amount: number,
  options?: { session?: unknown }
): Promise<IWallet> {
  if (amount <= 0) {
    throw new Error("Debit amount must be positive");
  }
  if (this.balance < amount) {
    throw new Error("Insufficient wallet balance");
  }
  this.balance -= amount;
  return this.save(options);
};

/**
 * Get balance in SAR (converted from halalas)
 */
WalletSchema.methods.getBalanceInSAR = function (): number {
  return this.balance / 100;
};

// ============================================================================
// STATICS
// ============================================================================

/**
 * Find or create wallet for user
 */
WalletSchema.statics.findOrCreate = async function (
  org_id: Types.ObjectId | string,
  user_id: Types.ObjectId | string
): Promise<IWallet> {
  let wallet = await this.findOne({ org_id, user_id });
  if (!wallet) {
    wallet = await this.create({
      org_id,
      user_id,
      balance: 0,
      pending_balance: 0,
      currency: "SAR",
      status: WalletStatus.ACTIVE,
    });
  }
  return wallet;
};

// ============================================================================
// MODEL EXPORT
// ============================================================================

export const Wallet = getModel<IWallet, IWalletModel>("Wallet", WalletSchema);
export default Wallet;
