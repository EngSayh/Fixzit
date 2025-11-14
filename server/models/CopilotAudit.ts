import { Schema, model, models, InferSchemaType } from "mongoose";
import { tenantIsolationPlugin } from '../plugins/tenantIsolation';

const AuditSchema = new Schema({
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

// Apply plugin BEFORE indexes
AuditSchema.plugin(tenantIsolationPlugin);

// Tenant-scoped composite index for common query patterns
AuditSchema.index({ orgId: 1, userId: 1, role: 1, createdAt: -1 });

export type CopilotAuditDoc = InferSchemaType<typeof AuditSchema>;

export const CopilotAudit = (typeof models !== 'undefined' && models.CopilotAudit) || model("CopilotAudit", AuditSchema);
