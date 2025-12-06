import { Schema, Model, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import tenantAuditPlugin from "@/server/models/plugins/tenantAudit";

const UploadedBySchema = new Schema(
  {
    id: String,
    name: String,
    email: String,
  },
  { _id: false },
);

const WorkOrderAttachmentSchema = new Schema(
  {
    // orgId injected by tenantIsolationPlugin
    workOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true },
    url: { type: String, required: true },
    thumbnailUrl: String,
    caption: String,
    type: String,
    fileName: String,
    fileSize: Number,
    metadata: Schema.Types.Mixed,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: UploadedBySchema, default: {} },
  },
  { timestamps: false, collection: "workorder_attachments" },
);

WorkOrderAttachmentSchema.plugin(tenantAuditPlugin);

WorkOrderAttachmentSchema.index({ orgId: 1, workOrderId: 1, uploadedAt: -1 });
WorkOrderAttachmentSchema.index({ orgId: 1, uploadedAt: -1 });

export type WorkOrderAttachmentDoc = InferSchemaType<typeof WorkOrderAttachmentSchema>;

export const WorkOrderAttachment: Model<WorkOrderAttachmentDoc> =
  getModel<WorkOrderAttachmentDoc>("WorkOrderAttachment", WorkOrderAttachmentSchema);
