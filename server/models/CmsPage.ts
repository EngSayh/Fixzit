/**
 * @module server/models/CmsPage
 * @description Content Management System (CMS) for dynamic pages and landing content.
 *              Supports tenant-specific pages with draft/publish workflow.
 *
 * @features
 * - Slug-based routing for SEO-friendly URLs (e.g., /about-us, /terms-of-service)
 * - Draft/published status workflow
 * - Tenant-scoped content (orgId isolation)
 * - HTML/Markdown content support
 * - Unique slug enforcement per tenant
 *
 * @statuses
 * - DRAFT: Editable, not visible to public
 * - PUBLISHED: Live, visible to public
 *
 * @indexes
 * - { orgId: 1, slug: 1 } (unique) — Ensure slug uniqueness per tenant
 *
 * @relationships
 * - No explicit references; standalone content pages
 * - Integrates with public-facing landing routes and help system
 *
 * @audit
 * - createdBy, updatedBy: Auto-tracked via auditPlugin
 * - timestamps: createdAt, updatedAt from Mongoose
 */
import { Schema, InferSchemaType, Types } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

const CmsPageSchema = new Schema(
  {
    // tenantId will be added by tenantIsolationPlugin
    slug: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED"],
      default: "PUBLISHED",
    },
    // updatedBy, updatedAt, createdBy, createdAt will be added by auditPlugin
  },
  { timestamps: true },
);

// Apply plugins BEFORE indexes
CmsPageSchema.plugin(tenantIsolationPlugin);
CmsPageSchema.plugin(auditPlugin);

// Ensure slug uniqueness is scoped to tenant
CmsPageSchema.index(
  { orgId: 1, slug: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } },
);

export type CmsPageDoc = InferSchemaType<typeof CmsPageSchema> & {
  createdBy?: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
};

export const CmsPage = getModel<CmsPageDoc>("CmsPage", CmsPageSchema);
