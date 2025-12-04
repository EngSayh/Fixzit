import { Schema, Model, models, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";

const QaLogSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, index: true, sparse: true },
    event: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
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
