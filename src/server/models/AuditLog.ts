import { Schema, model, models, InferSchemaType } from "mongoose";

const AuditLogSchema = new Schema({
  tenantId: { type: String, index: true, required: true },
  actorId: { type: String },
  action: { type: String, required: true, index: true },
  entity: { type: String, required: true, index: true },
  payload: { type: Schema.Types.Mixed },
  ip: { type: String }
}, { timestamps: { createdAt: true, updatedAt: false }, collection: 'audit_logs' });

AuditLogSchema.index({ tenantId: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, entity: 1, createdAt: -1 });

export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema>;

export const AuditLog = models.AuditLog || model("AuditLog", AuditLogSchema);

