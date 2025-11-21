/**
 * EscrowRelease Model
 *
 * Tracks release requests from escrow, their approval state, and linkage
 * to the underlying escrow transactions.
 */

import { Schema, Types } from 'mongoose';
import { ensureMongoConnection } from '@/server/lib/db';
import { tenantIsolationPlugin } from '@/server/plugins/tenantIsolation';
import { auditPlugin } from '@/server/plugins/auditPlugin';
import { getModel, MModel } from '@/src/types/mongoose-compat';

ensureMongoConnection();

export const EscrowReleaseStatus = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  RELEASED: 'RELEASED',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED',
} as const;

export type EscrowReleaseStatusValue =
  (typeof EscrowReleaseStatus)[keyof typeof EscrowReleaseStatus];

export interface IEscrowRelease {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  escrowAccountId: Types.ObjectId;
  requestedBy?: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  releaseTransactionId?: Types.ObjectId;
  refundTransactionId?: Types.ObjectId;
  amount: number;
  currency: string;
  status: EscrowReleaseStatusValue;
  scheduledFor?: Date;
  requestedAt: Date;
  releasedAt?: Date;
  notes?: string;
  autoRelease?: boolean;
  reason?: string;
  riskFlags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const EscrowReleaseSchema = new Schema<IEscrowRelease>(
  {
    orgId: { type: Schema.Types.ObjectId, required: true, index: true },
    escrowAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'EscrowAccount',
      required: true,
      index: true,
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    releaseTransactionId: { type: Schema.Types.ObjectId, ref: 'EscrowTransaction' },
    refundTransactionId: { type: Schema.Types.ObjectId, ref: 'EscrowTransaction' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'SAR', uppercase: true },
    status: {
      type: String,
      enum: Object.values(EscrowReleaseStatus),
      default: EscrowReleaseStatus.REQUESTED,
      required: true,
      index: true,
    },
    scheduledFor: { type: Date },
    requestedAt: { type: Date, required: true, default: () => new Date(), index: true },
    releasedAt: { type: Date },
    notes: { type: String },
    autoRelease: { type: Boolean, default: false },
    reason: { type: String },
    riskFlags: { type: [String], default: [] },
  },
  { timestamps: true, collection: 'finance_escrow_releases' }
);

EscrowReleaseSchema.plugin(tenantIsolationPlugin);
EscrowReleaseSchema.plugin(auditPlugin);

EscrowReleaseSchema.index({ orgId: 1, escrowAccountId: 1, status: 1 });
EscrowReleaseSchema.index({ orgId: 1, scheduledFor: 1, status: 1 });

export const EscrowRelease =
  getModel<IEscrowRelease, MModel<IEscrowRelease>>('EscrowRelease', EscrowReleaseSchema);
