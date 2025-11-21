/**
 * Settlement Model - Manages seller payment settlements
 * @module server/models/souq/Settlement
 */

import mongoose, { Schema, Model, Types } from 'mongoose'
import { getModel, MModel } from '@/src/types/mongoose-compat';;

export interface ISettlement {
  _id: Types.ObjectId;
  settlementId: string;
  sellerId: Types.ObjectId;
  org_id: string;
  escrowAccountId?: Types.ObjectId;
  period: string; // YYYY-MM format
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  platformFee: number;
  platformFeeRate: number;
  adjustments: number;
  payoutAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  dueDate: Date;
  paidDate?: Date;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
  processedBy?: Types.ObjectId;
  processedAt?: Date;
  orderIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const SettlementSchema = new Schema<ISettlement>(
  {
    settlementId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'SouqSeller',
      required: true,
      index: true,
    },
    escrowAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'EscrowAccount',
    },
    org_id: {
      type: String,
      required: true,
      index: true,
    },
    period: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalRevenue: {
      type: Number,
      required: true,
      default: 0,
    },
    platformFee: {
      type: Number,
      required: true,
      default: 0,
    },
    platformFeeRate: {
      type: Number,
      required: true,
      default: 10, // 10%
    },
    adjustments: {
      type: Number,
      default: 0,
    },
    payoutAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'paid', 'cancelled'],
      default: 'pending',
      index: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paidDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
    },
    transactionId: {
      type: String,
    },
    notes: {
      type: String,
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    processedAt: {
      type: Date,
    },
    orderIds: [{
      type: Schema.Types.ObjectId,
      ref: 'SouqOrder',
    }],
  },
  {
    timestamps: true,
    collection: 'souq_settlements',
  }
);

// Indexes
SettlementSchema.index({ sellerId: 1, period: 1 }, { unique: true });
SettlementSchema.index({ org_id: 1, status: 1 });
SettlementSchema.index({ dueDate: 1 });

// Pre-save hook to calculate payout amount
SettlementSchema.pre('save', function (next) {
  if (this.isModified('totalRevenue') || this.isModified('platformFee') || this.isModified('adjustments')) {
    this.payoutAmount = this.totalRevenue - this.platformFee + this.adjustments;
  }
  next();
});

export const SouqSettlement =
  getModel<any>('SouqSettlement', SettlementSchema);
