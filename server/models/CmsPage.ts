import { Schema, model, models, InferSchemaType } from 'mongoose';
import { tenantIsolationPlugin } from '../plugins/tenantIsolation';
import { auditPlugin } from '../plugins/auditPlugin';

const CmsPageSchema = new Schema({
  // tenantId will be added by tenantIsolationPlugin
  slug: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  status: { type: String, enum: ["DRAFT","PUBLISHED"], default: "PUBLISHED" }
  // updatedBy, updatedAt, createdBy, createdAt will be added by auditPlugin
}, { timestamps: true });

// Apply plugins BEFORE indexes
CmsPageSchema.plugin(tenantIsolationPlugin);
CmsPageSchema.plugin(auditPlugin);

// Ensure slug uniqueness is scoped to tenant
CmsPageSchema.index({ orgId: 1, slug: 1 }, { unique: true });

export type CmsPageDoc = InferSchemaType<typeof CmsPageSchema>;

// Check if we're using mock database
export const CmsPage = (typeof models !== 'undefined' && models.CmsPage) || model("CmsPage", CmsPageSchema);
