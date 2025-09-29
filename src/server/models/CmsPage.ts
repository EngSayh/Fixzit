import { Schema, model, models, InferSchemaType } from "mongoose";

const CmsPageSchema = new Schema({
  tenantId: { type: String, required: true, index: true }, // Required for tenant isolation
  slug: { type: String, required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true }, // Markdown
  status: { type: String, enum: ["DRAFT","PUBLISHED"], default: "PUBLISHED", index: true },
  updatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure slug uniqueness is scoped to tenant
CmsPageSchema.index({ tenantId: 1, slug: 1 }, { unique: true });

export type CmsPageDoc = InferSchemaType<typeof CmsPageSchema>;

// Check if we're using mock database
export const CmsPage = models.CmsPage || model("CmsPage", CmsPageSchema);
