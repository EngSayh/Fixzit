import { Schema, model, models, InferSchemaType } from "mongoose";

const AuditSchema = new Schema({
  tenantId: { type: String },
  userId: { type: String },
  role: { type: String },
  locale: { type: String, default: "en" },
  intent: { type: String },
  tool: { type: String },
  status: { type: String, enum: ["SUCCESS","DENIED","ERROR"], default: "SUCCESS" },
  message: { type: String },
  prompt: { type: String },
  response: { type: String },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: { createdAt: true, updatedAt: false } });

// Composite index for common query patterns: tenant-scoped queries with user filtering and time-based sorting
AuditSchema.index({ tenantId: 1, userId: 1, role: 1, createdAt: -1 });

export type CopilotAuditDoc = InferSchemaType<typeof AuditSchema>;

export const CopilotAudit = models.CopilotAudit || model("CopilotAudit", AuditSchema);
