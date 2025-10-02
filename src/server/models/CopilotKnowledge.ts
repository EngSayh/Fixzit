import { Schema, model, models, InferSchemaType } from "mongoose";

const KnowledgeSchema = new Schema({
  tenantId: { type: String, index: true, default: null },
  roles: { type: [String], index: true, default: [] },
  locale: { type: String, index: true, default: "en" },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  tags: { type: [String], default: [] },
  source: { type: String },
  content: { type: String, required: true },
  embedding: { type: [Number], default: [] },
  checksum: { type: String, index: true },
  createdBy: { type: String },
  updatedBy: { type: String }
}, {
  timestamps: true
});

KnowledgeSchema.index({ title: "text", content: "text", tags: "text" });
KnowledgeSchema.index({ tenantId: 1, locale: 1 });
KnowledgeSchema.index({ roles: 1 });

export type KnowledgeDoc = InferSchemaType<typeof KnowledgeSchema>;

export const CopilotKnowledge = models.CopilotKnowledge || model("CopilotKnowledge", KnowledgeSchema);

