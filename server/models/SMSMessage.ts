/**
 * SMS Message Model
 *
 * Tracks all outbound SMS messages with status, retry history, and SLA compliance.
 * Supports queue-based retry with exponential backoff.
 *
 * @module server/models/SMSMessage
 */

import { Schema, model, models, HydratedDocument, Types } from "mongoose";
import { MModel } from "@/types/mongoose-compat";
import { auditPlugin, setAuditContext } from "../plugins/auditPlugin";

// ---------- Enums ----------
export const SMSStatus = [
  "PENDING",
  "QUEUED",
  "SENT",
  "DELIVERED",
  "FAILED",
  "EXPIRED",
] as const;
export type TSMSStatus = (typeof SMSStatus)[number];

export const SMSProvider = ["TWILIO", "UNIFONIC", "AWS_SNS", "NEXMO", "LOCAL"] as const;
export type TSMSProvider = (typeof SMSProvider)[number];

export const SMSType = [
  "OTP",
  "NOTIFICATION",
  "ALERT",
  "MARKETING",
  "TRANSACTIONAL",
] as const;
export type TSMSType = (typeof SMSType)[number];

export const SMSPriority = ["LOW", "NORMAL", "HIGH", "CRITICAL"] as const;
export type TSMSPriority = (typeof SMSPriority)[number];

// ---------- Interfaces ----------
export interface ISMSRetryHistory {
  attemptNumber: number;
  attemptedAt: Date;
  provider: TSMSProvider;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  providerMessageId?: string;
  durationMs?: number;
}

export interface ISMSMessage {
  _id: Types.ObjectId;

  // Message content
  to: string;
  message: string;
  type: TSMSType;
  priority: TSMSPriority;

  // Status tracking
  status: TSMSStatus;
  provider?: TSMSProvider;
  providerMessageId?: string;

  // Timing
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  expiresAt?: Date;

  // Retry configuration
  maxRetries: number;
  retryCount: number;
  nextRetryAt?: Date;
  retryHistory: ISMSRetryHistory[];

  // SLA tracking
  slaTargetMs?: number; // Target delivery time in ms
  slaBreached: boolean;
  slaBreachAt?: Date;

  // Organization context
  orgId?: string;
  userId?: string;
  referenceType?: string; // e.g., "WorkOrder", "Invoice"
  referenceId?: string;

  // Metadata
  metadata?: Record<string, unknown>;
  tags?: string[];

  // Cost tracking (populated from SMSSettings.costPerMessage on send)
  cost?: number;
  currency?: string; // e.g., "OMR", "USD"

  // Error tracking
  lastError?: string;
  lastErrorCode?: string;
}

// ---------- Schema ----------
const SMSRetryHistorySchema = new Schema<ISMSRetryHistory>(
  {
    attemptNumber: { type: Number, required: true },
    attemptedAt: { type: Date, required: true },
    provider: { type: String, enum: SMSProvider, required: true },
    success: { type: Boolean, required: true },
    errorCode: { type: String },
    errorMessage: { type: String },
    providerMessageId: { type: String },
    durationMs: { type: Number },
  },
  { _id: false }
);

const SMSMessageSchema = new Schema<ISMSMessage>(
  {
    to: { type: String, required: true, index: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: SMSType,
      required: true,
      default: "NOTIFICATION",
    },
    priority: {
      type: String,
      enum: SMSPriority,
      required: true,
      default: "NORMAL",
    },

    status: {
      type: String,
      enum: SMSStatus,
      required: true,
      default: "PENDING",
      index: true,
    },
    provider: { type: String, enum: SMSProvider },
    providerMessageId: { type: String, index: true },

    scheduledAt: { type: Date },
    sentAt: { type: Date, index: true },
    deliveredAt: { type: Date },
    expiresAt: { type: Date, index: true },

    maxRetries: { type: Number, default: 3 },
    retryCount: { type: Number, default: 0 },
    nextRetryAt: { type: Date, index: true },
    retryHistory: { type: [SMSRetryHistorySchema], default: [] },

    slaTargetMs: { type: Number },
    slaBreached: { type: Boolean, default: false, index: true },
    slaBreachAt: { type: Date },

    orgId: { type: String, index: true },
    userId: { type: String },
    referenceType: { type: String },
    referenceId: { type: String, index: true },

    metadata: { type: Schema.Types.Mixed },
    tags: { type: [String], index: true },

    // Cost tracking
    cost: { type: Number },
    currency: { type: String, default: "OMR" },

    lastError: { type: String },
    lastErrorCode: { type: String },
  },
  {
    timestamps: true,
    collection: "sms_messages",
  }
);

// ---------- Indexes ----------
SMSMessageSchema.index({ status: 1, nextRetryAt: 1 }); // For retry queue processing
SMSMessageSchema.index({ orgId: 1, createdAt: -1 }); // For org-specific listing
SMSMessageSchema.index({ status: 1, createdAt: -1 }); // For status filtering
SMSMessageSchema.index({ type: 1, status: 1 }); // For type-based queries
SMSMessageSchema.index({ slaBreached: 1, status: 1 }); // For SLA breach monitoring

// TTL index for auto-cleanup of old delivered messages (90 days)
SMSMessageSchema.index(
  { deliveredAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { status: "DELIVERED" } }
);

// ---------- Statics ----------
SMSMessageSchema.statics.getPendingForRetry = async function (
  limit = 100
): Promise<ISMSMessage[]> {
  const now = new Date();
  return this.find({
    status: { $in: ["PENDING", "FAILED"] },
    $or: [
      { nextRetryAt: { $lte: now } },
      { nextRetryAt: { $exists: false }, status: "PENDING" },
    ],
    $expr: { $lt: ["$retryCount", "$maxRetries"] },
    expiresAt: { $gt: now },
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit)
    .lean();
};

SMSMessageSchema.statics.getStatusCounts = async function (
  orgId?: string,
  options?: { allowGlobal?: boolean }
): Promise<Record<TSMSStatus, number>> {
  if (!orgId && !options?.allowGlobal) {
    throw new Error("orgId is required to fetch status counts (set allowGlobal to true for global stats)");
  }

  const match: Record<string, unknown> = {};
  if (orgId) match.orgId = orgId;

  const pipeline = [{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 } } }];
  const result = await this.aggregate(pipeline);

  const counts: Record<string, number> = {};
  for (const status of SMSStatus) {
    counts[status] = 0;
  }
  for (const item of result) {
    counts[item._id] = item.count;
  }
  return counts as Record<TSMSStatus, number>;
};

SMSMessageSchema.statics.getSLABreachCount = async function (
  orgId?: string,
  since?: Date,
  options?: { allowGlobal?: boolean }
): Promise<number> {
  if (!orgId && !options?.allowGlobal) {
    throw new Error("orgId is required to fetch SLA breach counts (set allowGlobal to true for global stats)");
  }

  const match: Record<string, unknown> = { slaBreached: true };
  if (orgId) match.orgId = orgId;
  if (since) match.slaBreachAt = { $gte: since };

  return this.countDocuments(match);
};

SMSMessageSchema.statics.recordAttempt = async function (
  messageId: string | Types.ObjectId,
  attempt: Omit<ISMSRetryHistory, "attemptNumber">
): Promise<ISMSMessage | null> {
  const message = await this.findById(messageId);
  if (!message) return null;

  const attemptNumber = message.retryCount + 1;
  const retryEntry: ISMSRetryHistory = {
    ...attempt,
    attemptNumber,
  };

  const update: Record<string, unknown> = {
    $push: { retryHistory: retryEntry },
    $inc: { retryCount: 1 },
  };

  if (attempt.success) {
    update.$set = {
      status: "SENT",
      sentAt: new Date(),
      provider: attempt.provider,
      providerMessageId: attempt.providerMessageId,
      lastError: null,
      lastErrorCode: null,
    };
  } else {
    const nextDelay = Math.min(
      2 ** attemptNumber * 1000, // Exponential backoff: 2s, 4s, 8s...
      300000 // Max 5 minutes
    );
    update.$set = {
      status: attemptNumber >= message.maxRetries ? "FAILED" : "PENDING",
      nextRetryAt: new Date(Date.now() + nextDelay),
      lastError: attempt.errorMessage,
      lastErrorCode: attempt.errorCode,
    };
  }

  // Check SLA breach
  if (message.slaTargetMs && !message.slaBreached) {
    const elapsed = Date.now() - message.createdAt.getTime();
    if (elapsed > message.slaTargetMs) {
      (update.$set as Record<string, unknown>).slaBreached = true;
      (update.$set as Record<string, unknown>).slaBreachAt = new Date();
    }
  }

  return this.findByIdAndUpdate(messageId, update, { new: true });
};

SMSMessageSchema.statics.markDelivered = async function (
  providerMessageId: string,
  deliveredAt?: Date,
  orgId?: string
): Promise<ISMSMessage | null> {
  const filter: Record<string, unknown> = { providerMessageId, status: "SENT" };
  if (orgId) filter.orgId = orgId;

  return this.findOneAndUpdate(
    filter,
    {
      $set: {
        status: "DELIVERED",
        deliveredAt: deliveredAt || new Date(),
      },
    },
    { new: true }
  );
};

// ---------- Plugins ----------
SMSMessageSchema.plugin(auditPlugin);

// ---------- Type Extensions ----------
interface SMSMessageStatics {
  getPendingForRetry(limit?: number): Promise<ISMSMessage[]>;
  getStatusCounts(orgId?: string, options?: { allowGlobal?: boolean }): Promise<Record<TSMSStatus, number>>;
  getSLABreachCount(orgId?: string, since?: Date, options?: { allowGlobal?: boolean }): Promise<number>;
  recordAttempt(
    messageId: string | Types.ObjectId,
    attempt: Omit<ISMSRetryHistory, "attemptNumber">
  ): Promise<ISMSMessage | null>;
  markDelivered(
    providerMessageId: string,
    deliveredAt?: Date,
    orgId?: string
  ): Promise<ISMSMessage | null>;
}

type SMSMessageModel = MModel<ISMSMessage> & SMSMessageStatics;
export type SMSMessageDocument = HydratedDocument<ISMSMessage>;

// ---------- Export ----------
export const SMSMessage = (models.SMSMessage ||
  model<ISMSMessage>("SMSMessage", SMSMessageSchema)) as unknown as SMSMessageModel;
