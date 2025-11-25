/**
 * Souq Settlement MongoDB Model
 *
 * Stores settlement statements for seller payouts.
 */

import mongoose, { Schema, Document } from "mongoose";

export interface ISouqSettlement extends Document {
  settlementId: string;
  sellerId: mongoose.Types.ObjectId;
  escrowAccountId?: mongoose.Types.ObjectId;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalOrders: number;
    grossSales: number;
    platformCommissions: number;
    gatewayFees: number;
    vat: number;
    refunds: number;
    chargebacks: number;
    reserves: number;
    netPayout: number;
  };
  transactions: Array<{
    transactionId: string;
    orderId: string;
    type:
      | "sale"
      | "refund"
      | "commission"
      | "gateway_fee"
      | "vat"
      | "reserve_hold"
      | "reserve_release"
      | "adjustment"
      | "chargeback";
    amount: number;
    timestamp: Date;
    description: string;
  }>;
  status: "draft" | "pending" | "approved" | "paid" | "failed" | "rejected";
  generatedAt: Date;
  paidAt?: Date;
  paidDate?: Date; // Backward compatibility
  notes?: string;
  processedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  payoutId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SouqSettlementSchema = new Schema<ISouqSettlement>(
  {
    settlementId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    escrowAccountId: {
      type: Schema.Types.ObjectId,
      ref: "EscrowAccount",
    },
    period: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    summary: {
      totalOrders: { type: Number, default: 0 },
      grossSales: { type: Number, default: 0 },
      platformCommissions: { type: Number, default: 0 },
      gatewayFees: { type: Number, default: 0 },
      vat: { type: Number, default: 0 },
      refunds: { type: Number, default: 0 },
      chargebacks: { type: Number, default: 0 },
      reserves: { type: Number, default: 0 },
      netPayout: { type: Number, default: 0 },
    },
    transactions: [
      {
        transactionId: { type: String, required: true },
        orderId: { type: String, required: true },
        type: {
          type: String,
          required: true,
          enum: [
            "sale",
            "refund",
            "commission",
            "gateway_fee",
            "vat",
            "reserve_hold",
            "reserve_release",
            "adjustment",
            "chargeback",
          ],
        },
        amount: { type: Number, required: true },
        timestamp: { type: Date, required: true },
        description: { type: String, required: true },
      },
    ],
    status: {
      type: String,
      required: true,
      enum: ["draft", "pending", "approved", "paid", "failed", "rejected"],
      default: "draft",
      index: true,
    },
    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    paidAt: Date,
    paidDate: Date, // Backward compatibility
    notes: String,
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    processedAt: Date,
    payoutId: String,
  },
  {
    timestamps: true,
    collection: "souq_settlements",
  },
);

// Indexes
SouqSettlementSchema.index({ sellerId: 1, "period.start": -1 });
SouqSettlementSchema.index({ status: 1, generatedAt: -1 });

export const SouqSettlement =
  (mongoose.models.SouqSettlement as mongoose.Model<ISouqSettlement>) ||
  mongoose.model<ISouqSettlement>("SouqSettlement", SouqSettlementSchema);
