import { Schema, model, models, InferSchemaType } from "mongoose";
import { MockModel } from "@/src/lib/mockDb";

const CmsPageSchema = new Schema({
  tenantId: { type: String }, // null/undefined => global
  slug: { type: String, required: true, index: true, unique: true },
  title: { type: String, required: true },
  content: { type: String, required: true }, // Markdown
  status: { type: String, enum: ["DRAFT","PUBLISHED"], default: "PUBLISHED", index: true },
  updatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export type CmsPageDoc = InferSchemaType<typeof CmsPageSchema>;

// Check if we're using mock database (explicit flag only)
const isMockDB = String(process.env.USE_MOCK_DB || '').toLowerCase() === 'true';

export const CmsPage = isMockDB 
  ? new MockModel('cmspages') as any
  : (models.CmsPage || model("CmsPage", CmsPageSchema));
