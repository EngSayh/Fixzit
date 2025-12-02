/**
 * EscrowAccount Model
 *
 * Represents funds held in escrow for Aqar bookings and Marketplace orders.
 * Tracks lifecycle from creation through funding, release, refund, or failure with
 * tenant isolation and audit history.
 */

import { Schema, Types } from "mongoose";
import { ensureMongoConnection } from "@/server/lib/db";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";
import { auditPlugin } from "@/server/plugins/auditPlugin";
import { getModel, MModel } from "@/types/mongoose-compat";

ensureMongoConnection();

export const EscrowState = {
  CREATED: "CREATED",
  FUNDED: "FUNDED",
  RELEASE_REQUESTED: "RELEASE_REQUESTED",
  RELEASED: "RELEASED",
  REFUND_REQUESTED: "REFUND_REQUESTED",
  REFUNDED: "REFUNDED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;

export const EscrowSource = {
  AQAR_BOOKING: "AQAR_BOOKING",
  MARKETPLACE_ORDER: "MARKETPLACE_ORDER",
} as const;

export type EscrowStateValue = (typeof EscrowState)[keyof typeof EscrowState];
export type EscrowSourceValue =
  (typeof EscrowSource)[keyof typeof EscrowSource];

export interface IEscrowAuditTrailEntry {
  at: Date;
  action:
    | "created"
    | "funded"
    | "release_requested"
    | "released"
    | "refund_requested"
    | "refunded"
    | "failed"
    | "cancelled";
  actorId?: Types.ObjectId;
  actorType?: "SYSTEM" | "USER";
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface IEscrowAccount {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  escrowNumber: string;
  source: EscrowSourceValue;
  sourceId: Types.ObjectId;
  buyerId?: Types.ObjectId;
  sellerId?: Types.ObjectId;
  currency: string;
  expectedAmount: number;
  fundedAmount: number;
  releasedAmount: number;
  refundedAmount: number;
  holdAmount: number;
  status: EscrowStateValue;
  releasePolicy?: {
    autoReleaseAt?: Date;
    requiresReview?: boolean;
    expiresAt?: Date;
    riskHold?: boolean;
  };
  bookingId?: Types.ObjectId;
  orderId?: Types.ObjectId;
  payoutRequestId?: Types.ObjectId;
  settlementId?: Types.ObjectId;
  notes?: string;
  idempotencyKeys?: string[];
  auditTrail: IEscrowAuditTrailEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const EscrowAccountSchema = new Schema<IEscrowAccount>(
  {
    orgId: { type: Schema.Types.ObjectId, required: true, index: true },
    escrowNumber: { type: String, required: true, unique: true, index: true },
    source: {
      type: String,
      enum: Object.values(EscrowSource),
      required: true,
      index: true,
    },
    sourceId: { type: Schema.Types.ObjectId, required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    currency: { type: String, required: true, default: "SAR", uppercase: true },
    expectedAmount: { type: Number, required: true, min: 0 },
    fundedAmount: { type: Number, required: true, default: 0, min: 0 },
    releasedAmount: { type: Number, required: true, default: 0, min: 0 },
    refundedAmount: { type: Number, required: true, default: 0, min: 0 },
    holdAmount: { type: Number, required: true, default: 0, min: 0 },
    status: {
      type: String,
      enum: Object.values(EscrowState),
      required: true,
      default: EscrowState.CREATED,
      index: true,
    },
    releasePolicy: {
      autoReleaseAt: { type: Date },
      requiresReview: { type: Boolean, default: false },
      expiresAt: { type: Date },
      riskHold: { type: Boolean, default: false },
    },
    bookingId: { type: Schema.Types.ObjectId, ref: "AqarBooking", index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "SouqOrder", index: true },
    payoutRequestId: {
      type: Schema.Types.ObjectId,
      ref: "SouqPayoutRequest",
      index: true,
    },
    settlementId: {
      type: Schema.Types.ObjectId,
      ref: "SouqSettlement",
      index: true,
    },
    notes: { type: String },
    idempotencyKeys: { type: [String], default: [] },
    auditTrail: {
      type: [
        {
          at: { type: Date, required: true, default: () => new Date() },
          action: {
            type: String,
            required: true,
            enum: [
              "created",
              "funded",
              "release_requested",
              "released",
              "refund_requested",
              "refunded",
              "failed",
              "cancelled",
            ],
          },
          actorId: { type: Schema.Types.ObjectId, ref: "User" },
          actorType: { type: String, enum: ["SYSTEM", "USER"] },
          reason: { type: String },
          metadata: { type: Schema.Types.Mixed },
        },
      ],
      default: [],
    },
  },
  { timestamps: true, collection: "finance_escrow_accounts" },
);

EscrowAccountSchema.plugin(tenantIsolationPlugin);
EscrowAccountSchema.plugin(auditPlugin);

EscrowAccountSchema.index(
  { orgId: 1, source: 1, sourceId: 1 },
  { unique: true },
);
EscrowAccountSchema.index({
  orgId: 1,
  status: 1,
  "releasePolicy.autoReleaseAt": 1,
});
EscrowAccountSchema.index({ orgId: 1, buyerId: 1 });
EscrowAccountSchema.index({ orgId: 1, sellerId: 1 });

export const EscrowAccount = getModel<IEscrowAccount, MModel<IEscrowAccount>>(
  "EscrowAccount",
  EscrowAccountSchema,
);
