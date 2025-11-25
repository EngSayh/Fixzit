/**
 * Souq Transaction MongoDB Model
 *
 * Stores seller transaction history for balance tracking.
 */

import mongoose, { Schema, Document } from "mongoose";

export interface ISouqTransaction extends Document {
  transactionId: string;
  sellerId: mongoose.Types.ObjectId;
  orderId?: string;
  type:
    | "sale"
    | "refund"
    | "commission"
    | "gateway_fee"
    | "vat"
    | "reserve_hold"
    | "reserve_release"
    | "withdrawal"
    | "adjustment"
    | "chargeback";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  metadata?: Record<string, unknown>;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SouqTransactionSchema = new Schema<ISouqTransaction>(
  {
    transactionId: {
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
    orderId: {
      type: String,
      index: true,
    },
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
        "withdrawal",
        "adjustment",
        "chargeback",
      ],
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "souq_transactions",
  },
);

// Indexes
SouqTransactionSchema.index({ sellerId: 1, createdAt: -1 });
SouqTransactionSchema.index({ sellerId: 1, type: 1, createdAt: -1 });

export const SouqTransaction =
  (mongoose.models.SouqTransaction as mongoose.Model<ISouqTransaction>) ||
  mongoose.model<ISouqTransaction>("SouqTransaction", SouqTransactionSchema);
