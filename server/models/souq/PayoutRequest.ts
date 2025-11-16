/**
 * Souq Payout Request MongoDB Model
 * 
 * Stores payout requests for seller withdrawals.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ISouqPayoutRequest extends Document {
  payoutId: string;
  sellerId: mongoose.Types.ObjectId;
  statementId: string;
  amount: number;
  currency: string;
  bankAccount: {
    bankName: string;
    accountNumber: string;
    iban: string;
    accountHolderName: string;
    swiftCode?: string;
  };
  method: 'sadad' | 'span' | 'manual';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  transactionReference?: string; // Bank transaction ID
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SouqPayoutRequestSchema = new Schema<ISouqPayoutRequest>(
  {
    payoutId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    statementId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'SAR',
    },
    bankAccount: {
      bankName: { type: String, required: true },
      accountNumber: { type: String, required: true },
      iban: { type: String, required: true },
      accountHolderName: { type: String, required: true },
      swiftCode: String,
    },
    method: {
      type: String,
      required: true,
      enum: ['sadad', 'span', 'manual'],
      default: 'sadad',
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    requestedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    processedAt: Date,
    completedAt: Date,
    failedAt: Date,
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    errorMessage: String,
    transactionReference: String,
    notes: String,
  },
  {
    timestamps: true,
    collection: 'souq_payouts',
  }
);

// Indexes
SouqPayoutRequestSchema.index({ sellerId: 1, status: 1, requestedAt: -1 });
SouqPayoutRequestSchema.index({ status: 1, retryCount: 1 });

export const SouqPayoutRequest =
  (mongoose.models.SouqPayoutRequest as mongoose.Model<ISouqPayoutRequest>) ||
  mongoose.model<ISouqPayoutRequest>('SouqPayoutRequest', SouqPayoutRequestSchema);
