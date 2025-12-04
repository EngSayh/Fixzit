import { Schema, Model, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import tenantAuditPlugin from "@/server/models/plugins/tenantAudit";

const AttachmentSchema = new Schema(
  {
    url: String,
    thumbnailUrl: String,
    caption: String,
    fileName: String,
    fileSize: Number,
    type: String,
  },
  { _id: false },
);

const CreatedBySchema = new Schema(
  {
    id: String,
    name: String,
    email: String,
  },
  { _id: false },
);

const WorkOrderCommentSchema = new Schema(
  {
    // orgId injected by tenantIsolationPlugin
    workOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true },
    comment: { type: String, required: true },
    type: { type: String, enum: ["comment", "internal"], default: "comment" },
    attachments: { type: [AttachmentSchema], default: [] },
    createdBy: { type: CreatedBySchema, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false, collection: "workorder_comments" },
);

WorkOrderCommentSchema.plugin(tenantAuditPlugin);

WorkOrderCommentSchema.index({ orgId: 1, workOrderId: 1, createdAt: -1 });
WorkOrderCommentSchema.index({ orgId: 1, createdAt: -1 });

export type WorkOrderCommentDoc = InferSchemaType<typeof WorkOrderCommentSchema>;

export const WorkOrderComment: Model<WorkOrderCommentDoc> = getModel<WorkOrderCommentDoc>(
  "WorkOrderComment",
  WorkOrderCommentSchema,
);
