/**
 * NotificationLog Model - Multi-channel notification tracking
 * 
 * @module server/models/NotificationLog
 * @description Tracks notification delivery across push, email, SMS, and WhatsApp channels.
 * Manages retry logic, delivery status, and failure tracking for audit and debugging.
 * 
 * @features
 * - Multi-channel delivery tracking (push/email/SMS/WhatsApp)
 * - Recipient preference management
 * - Delivery status per channel
 * - Retry attempt logging
 * - Success/failure metrics
 * - Error message capture
 * - User-level delivery issues tracking
 * 
 * @channels
 * - push: Mobile/web push notifications
 * - email: Email delivery via SES/SendGrid
 * - sms: SMS via Twilio/local providers
 * - whatsapp: WhatsApp Business API
 * 
 * @statuses
 * - pending: Queued for delivery
 * - sent: Successfully delivered
 * - partial: Some recipients succeeded, some failed
 * - failed: All delivery attempts failed
 * 
 * @issue_types
 * - failed: Delivery attempt failed (technical error)
 * - skipped: Recipient opted out or no contact info
 * 
 * @indexes
 * - Index: { createdAt } for time-based queries
 * - Index: { "recipients.userId" } for user notification history
 * - Index: { "channelResults.status" } for delivery monitoring
 * 
 * @relationships
 * - recipients.userId → User._id
 * - issues.userId → User._id
 * 
 * @audit
 * - All delivery attempts logged
 * - Retry history preserved
 * - Error messages captured for debugging
 */

import { Schema, model, models, Document, Types } from 'mongoose';
import { logger } from '@/lib/logger';

const NotificationRecipientSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    preferredChannels: { type: [String], default: [] },
  },
  { _id: false }
);

const ChannelResultSchema = new Schema(
  {
    channel: { type: String, enum: ['push', 'email', 'sms', 'whatsapp'], required: true },
    status: { type: String, enum: ['pending', 'sent', 'partial', 'failed'], required: true },
    attempts: { type: Number, default: 0 },
    succeeded: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    lastAttemptAt: Date,
    errorMessages: { type: [String], default: [] },
  },
  { _id: false }
);

const NotificationIssueSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    channel: { type: String, enum: ['push', 'email', 'sms', 'whatsapp'], required: true },
    type: { type: String, enum: ['failed', 'skipped'], required: true },
    reason: { type: String, required: true },
    attempt: Number,
    attemptedAt: Date,
    metadata: Schema.Types.Mixed,
  },
  { _id: false }
);

const MetricsSchema = new Schema(
  {
    attempted: { type: Number, default: 0 },
    succeeded: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
  },
  { _id: false }
);

// Parse TTL with validation to prevent silent index creation failures
const parseValidTtl = (envVar: string | undefined, defaultValue: number, name: string): number => {
  if (!envVar || envVar.trim() === '') return defaultValue;
  const parsed = parseInt(envVar, 10);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    if (process.env.NODE_ENV !== 'production') {
      logger.error(`[NotificationLog] Invalid ${name}`, { envVar, defaultValue });
    }
    return defaultValue;
  }
  return parsed;
};

const notificationTtlDays = parseValidTtl(process.env.NOTIFICATION_LOG_TTL_DAYS, 90, 'NOTIFICATION_LOG_TTL_DAYS');
const dlqTtlDays = parseValidTtl(process.env.NOTIFICATION_DLQ_TTL_DAYS, 30, 'NOTIFICATION_DLQ_TTL_DAYS');

const NotificationLogSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, required: true }, // index via compound { orgId: 1, notificationId: 1 }
    notificationId: { type: String, required: true },
    event: { type: String, required: true },
    recipients: { type: [NotificationRecipientSchema], default: [] },
    payload: { type: Schema.Types.Mixed },
    priority: { type: String, enum: ['high', 'normal', 'low'], default: 'normal' },
    sentAt: Date,
    deliveredAt: Date,
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'partial_failure'],
      default: 'pending',
    },
    failureReason: String,
    channelResults: { type: [ChannelResultSchema], default: [] },
    metrics: {
      type: MetricsSchema,
      default: () => ({ attempted: 0, succeeded: 0, failed: 0, skipped: 0 }),
    },
    issues: { type: [NotificationIssueSchema], default: [] },
  },
  { timestamps: true }
);

NotificationLogSchema.index(
  { orgId: 1, notificationId: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } },
);

if (notificationTtlDays > 0) {
  NotificationLogSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: notificationTtlDays * 24 * 60 * 60 }
  );
}

export interface NotificationLogDocument extends Document {
  orgId: Types.ObjectId;
  notificationId: string;
  event: string;
  recipients: Array<{ userId: Types.ObjectId; preferredChannels: string[] }>;
  payload?: Record<string, unknown>;
  priority: 'high' | 'normal' | 'low';
  sentAt?: Date;
  deliveredAt?: Date;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'partial_failure';
  failureReason?: string;
  channelResults: Array<{
    channel: string;
    status: 'pending' | 'sent' | 'partial' | 'failed';
    attempts: number;
    succeeded: number;
    failedCount: number;
    skipped: number;
    lastAttemptAt?: Date;
    errorMessages?: string[];
  }>;
  metrics?: {
    attempted: number;
    succeeded: number;
    failed: number;
    skipped: number;
  };
  issues: Array<{
    userId: Types.ObjectId;
    channel: string;
    type: 'failed' | 'skipped';
    reason: string;
    attempt?: number;
    attemptedAt?: Date;
    metadata?: Record<string, unknown>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export const NotificationLogModel =
  models.NotificationLog || model<NotificationLogDocument>('NotificationLog', NotificationLogSchema);

const NotificationDeadLetterSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, required: true, index: true },
    notificationId: { type: String, required: true, index: true },
    event: { type: String, required: true },
    channel: { type: String, enum: ['push', 'email', 'sms', 'whatsapp'], required: true },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: Date,
    error: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
    priority: { type: String, enum: ['high', 'normal', 'low'], default: 'normal' },
    status: { type: String, enum: ['pending', 'replayed', 'discarded'], default: 'pending' },
    recipient: {
      userId: Schema.Types.ObjectId,
      email: String,
      phone: String,
      preferredChannels: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

NotificationDeadLetterSchema.index({ orgId: 1, notificationId: 1 });

if (dlqTtlDays > 0) {
  NotificationDeadLetterSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: dlqTtlDays * 24 * 60 * 60 }
  );
}

export interface NotificationDeadLetterDocument extends Document {
  orgId: Types.ObjectId;
  notificationId: string;
  event: string;
  channel: string;
  attempts: number;
  lastAttemptAt?: Date;
  error: string;
  payload?: Record<string, unknown>;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'replayed' | 'discarded';
  recipient?: {
    userId?: Types.ObjectId;
    email?: string;
    phone?: string;
    preferredChannels?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export const NotificationDeadLetterModel =
  models.NotificationDeadLetter ||
  model<NotificationDeadLetterDocument>('NotificationDeadLetter', NotificationDeadLetterSchema);
