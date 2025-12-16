/**
 * @module server/models/qa/QaLog
 * @description QA Log model for general quality assurance event tracking.
 * Detailed event logging for testing, debugging, and quality monitoring with 90-day TTL.
 *
 * @features
 * - General event logging (info, warnings, debug events)
 * - Tenant isolation (orgId sparse index)
 * - Session tracking (sessionIdHash for user flows)
 * - User action tracking (userId, IP, userAgent)
 * - Automatic TTL expiry (90 days retention)
 * - Event type categorization
 * - Flexible data payload for event context
 * - Longer retention than QaAlert (90d vs 30d)
 *
 * @indexes
 * - { orgId: 1, timestamp: -1 } sparse - Tenant-scoped logs
 * - { orgId: 1, event: 1, timestamp: -1 } sparse - Filtered tenant logs
 * - { timestamp: -1 } - Global timeline
 * - { event: 1, timestamp: -1 } - Event type timeline
 * - { timestamp: 1 } TTL 90d - Auto-delete after 90 days
 *
 * @relationships
 * - User: userId references user in session
 * - Organization: orgId (sparse, tenant context)
 *
 * @compliance
 * - 90-day retention policy (TTL index)
 * - Audit trail for QA activities
 *
 * @audit
 * - timestamp: Event occurrence time
 * - userId/ip/userAgent/sessionIdHash: User context
 */
import { Schema, Model, models, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";

const QaLogSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, sparse: true },
    event: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    ip: { type: String },
    userAgent: { type: String },
    sessionIdHash: { type: String },
  },
  { collection: "qa_logs", timestamps: false },
);

QaLogSchema.index({ orgId: 1, timestamp: -1 }, { sparse: true, name: "qa_logs_orgId_timestamp" });
QaLogSchema.index(
  { orgId: 1, event: 1, timestamp: -1 },
  { sparse: true, name: "qa_logs_orgId_event_timestamp" },
);
QaLogSchema.index({ timestamp: -1 }, { name: "qa_logs_timestamp_desc" });
QaLogSchema.index({ event: 1, timestamp: -1 }, { name: "qa_logs_event_timestamp" });
QaLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60, name: "qa_logs_ttl_90d" },
);

export type QaLogDoc = InferSchemaType<typeof QaLogSchema>;

export const QaLog: Model<QaLogDoc> =
  (models.QaLog as Model<QaLogDoc> | undefined) || getModel<QaLogDoc>("QaLog", QaLogSchema);
