import { Schema, Model, models, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";

const QaAlertSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, index: true, sparse: true },
    event: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
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
