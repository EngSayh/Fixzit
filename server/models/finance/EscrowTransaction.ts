/**
 * EscrowTransaction Model
 *
 * Represents money movement into or out of an escrow account.
 * Used for funding, releases, refunds, and adjustments with idempotency keys.
 */

import { Schema, Types } from "mongoose";
import { ensureMongoConnection } from "@/server/lib/db";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";
import { auditPlugin } from "@/server/plugins/auditPlugin";
import { getModel, MModel } from "@/types/mongoose-compat";

ensureMongoConnection();

export const EscrowTransactionType = {
  FUND: "FUND",
  RELEASE: "RELEASE",
  REFUND: "REFUND",
  ADJUSTMENT: "ADJUSTMENT",
} as const;

export const EscrowTransactionStatus = {
  PENDING: "PENDING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  REVERSED: "REVERSED",
} as const;

export type EscrowTransactionTypeValue =
  (typeof EscrowTransactionType)[keyof typeof EscrowTransactionType];
export type EscrowTransactionStatusValue =
  (typeof EscrowTransactionStatus)[keyof typeof EscrowTransactionStatus];

export interface IEscrowTransaction {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  escrowAccountId: Types.ObjectId;
  type: EscrowTransactionTypeValue;
  status: EscrowTransactionStatusValue;
  amount: number;
  currency: string;
  idempotencyKey?: string;
  externalRef?: string;
  provider?: "PAYTABS" | "SADAD" | "SPAN" | "MANUAL" | "UNKNOWN";
  reason?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  executedAt?: Date;
  initiatedBy?: Types.ObjectId;
}

const EscrowTransactionSchema = new Schema<IEscrowTransaction>(
  {
    orgId: { type: Schema.Types.ObjectId, required: true, index: true },
    escrowAccountId: {
      type: Schema.Types.ObjectId,
      ref: "EscrowAccount",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(EscrowTransactionType),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(EscrowTransactionStatus),
      required: true,
      default: EscrowTransactionStatus.PENDING,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "SAR", uppercase: true },
    idempotencyKey: { type: String, index: true },
    externalRef: { type: String },
    provider: {
      type: String,
      enum: ["PAYTABS", "SADAD", "SPAN", "MANUAL", "UNKNOWN"],
      default: "UNKNOWN",
    },
    reason: { type: String },
    failureReason: { type: String },
    metadata: { type: Schema.Types.Mixed },
    executedAt: { type: Date },
    initiatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "finance_escrow_transactions" },
);

EscrowTransactionSchema.plugin(tenantIsolationPlugin);
EscrowTransactionSchema.plugin(auditPlugin);

EscrowTransactionSchema.index(
  { orgId: 1, idempotencyKey: 1 },
  { unique: true, sparse: true },
);
EscrowTransactionSchema.index({ orgId: 1, escrowAccountId: 1, createdAt: -1 });

export const EscrowTransaction = getModel<
  IEscrowTransaction,
  MModel<IEscrowTransaction>
>("EscrowTransaction", EscrowTransactionSchema);
