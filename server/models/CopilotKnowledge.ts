import { Schema, model, models, InferSchemaType } from "mongoose";
import { tenantIsolationPlugin } from '../plugins/tenantIsolation';
import { auditPlugin } from '../plugins/auditPlugin';

const KnowledgeSchema = new Schema({
  roles: { type: [String], default: [] },
  locale: { type: String, default: "en" },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  tags: { type: [String], default: [] },
  source: { type: String },
  content: { type: String, required: true },
  embedding: { type: [Number], default: [] },
  checksum: { type: String }
}, {
  timestamps: true
});

// Apply plugins BEFORE indexes
KnowledgeSchema.plugin(tenantIsolationPlugin);
KnowledgeSchema.plugin(auditPlugin);

// Tenant-scoped indexes for data isolation
KnowledgeSchema.index({ orgId: 1, slug: 1 }, { unique: true });
KnowledgeSchema.index({ orgId: 1, title: "text", content: "text", tags: "text" });
KnowledgeSchema.index({ orgId: 1, locale: 1 });
KnowledgeSchema.index({ orgId: 1, roles: 1 });

export type KnowledgeDoc = InferSchemaType<typeof KnowledgeSchema>;

export const CopilotKnowledge = (typeof models !== 'undefined' && models.CopilotKnowledge) || model("CopilotKnowledge", KnowledgeSchema);
