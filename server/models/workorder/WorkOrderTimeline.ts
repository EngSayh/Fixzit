import { Schema, Model, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import tenantAuditPlugin from "@/server/models/plugins/tenantAudit";

const PerformedBySchema = new Schema(
  {
    id: String,
    name: String,
    email: String,
  },
  { _id: false },
);

const WorkOrderTimelineSchema = new Schema(
  {
    // orgId injected by tenantIsolationPlugin
    workOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true },
    performedAt: { type: Date, default: Date.now },
    action: { type: String, required: true },
    description: String,
    metadata: { type: Schema.Types.Mixed },
    performedBy: { type: PerformedBySchema, default: {} },
  },
  { timestamps: false, collection: "workorder_timeline" },
);

WorkOrderTimelineSchema.plugin(tenantAuditPlugin);

WorkOrderTimelineSchema.index({ orgId: 1, workOrderId: 1, performedAt: -1 });
WorkOrderTimelineSchema.index({ orgId: 1, performedAt: -1 });

export type WorkOrderTimelineDoc = InferSchemaType<typeof WorkOrderTimelineSchema>;

export const WorkOrderTimeline: Model<WorkOrderTimelineDoc> =
  getModel<WorkOrderTimelineDoc>("WorkOrderTimeline", WorkOrderTimelineSchema);
