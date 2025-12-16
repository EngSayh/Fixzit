/**
 * @module server/models/qa/QaAlert
 * @description QA Alert model for critical quality assurance events.
 * Tracks high-priority system events requiring immediate attention with 30-day TTL.
 *
 * @features
 * - Critical event logging (errors, failures, anomalies)
 * - Tenant isolation (orgId sparse index for multi-tenant)
 * - User action tracking (userId, IP, userAgent)
 * - Automatic TTL expiry (30 days retention)
 * - Event type categorization
 * - Flexible data payload for event context
 * - High-performance sparse indexes for multi-tenant queries
 *
 * @indexes
 * - { orgId: 1, timestamp: -1 } sparse - Tenant-scoped alerts (most recent first)
 * - { orgId: 1, event: 1, timestamp: -1 } sparse - Filtered tenant alerts
 * - { timestamp: -1 } - Global alerts timeline
 * - { event: 1, timestamp: -1 } - Event type timeline
 * - { timestamp: 1 } TTL 30d - Auto-delete after 30 days
 *
 * @relationships
 * - User: userId references user who triggered alert
 * - Organization: orgId (sparse, tenant context)
 *
 * @compliance
 * - 30-day retention policy (TTL index)
 * - Audit trail for critical events
 *
 * @audit
 * - timestamp: Event occurrence time
 * - userId/ip/userAgent: User context
 */
import { Schema, Model, models, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";

const QaAlertSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, sparse: true },
    event: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    ip: { type: String },
    userAgent: { type: String },
  },
  { collection: "qa_alerts", timestamps: false },
);

QaAlertSchema.index({ orgId: 1, timestamp: -1 }, { sparse: true, name: "qa_alerts_orgId_timestamp" });
QaAlertSchema.index(
  { orgId: 1, event: 1, timestamp: -1 },
  { sparse: true, name: "qa_alerts_orgId_event_timestamp" },
);
QaAlertSchema.index({ timestamp: -1 }, { name: "qa_alerts_timestamp_desc" });
QaAlertSchema.index({ event: 1, timestamp: -1 }, { name: "qa_alerts_event_timestamp" });
QaAlertSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60, name: "qa_alerts_ttl_30d" },
);

export type QaAlertDoc = InferSchemaType<typeof QaAlertSchema>;

export const QaAlert: Model<QaAlertDoc> =
  (models.QaAlert as Model<QaAlertDoc> | undefined) || getModel<QaAlertDoc>("QaAlert", QaAlertSchema);
