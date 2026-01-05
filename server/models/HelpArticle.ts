/**
 * @module server/models/HelpArticle
 * @description Help documentation system for in-app knowledge base and user guides.
 *              Supports multi-language (en/ar), role-based access, and full-text search.
 *
 * @features
 * - Slug-based routing for SEO-friendly URLs (e.g., /help/work-order-creation)
 * - Category and tag organization
 * - Draft/published status workflow
 * - Route hints for contextual help (e.g., show article when user is on /work-orders)
 * - Locale support (en, ar) for i18n help content
 * - Role-based article visibility (e.g., admin-only articles)
 * - Full-text search on title, content, and tags
 * - Tenant-scoped content (orgId isolation)
 *
 * @statuses
 * - DRAFT: Editable, not visible to users
 * - PUBLISHED: Live, searchable, visible to permitted roles
 *
 * @indexes
 * - { orgId: 1, slug: 1 } (unique) — Ensure slug uniqueness per tenant
 * - { orgId: 1, title: "text", content: "text", tags: "text" } — Full-text search
 * - { orgId: 1, locale: 1 } — Filter by language
 * - { orgId: 1, roles: 1 } — Filter by permitted roles
 * - { orgId: 1, status: 1 } — Published articles only
 *
 * @relationships
 * - No explicit references; standalone help articles
 * - Integrates with role-based access control (RBAC) via roles array
 * - Linked to i18n system via locale field
 *
 * @audit
 * - createdBy, updatedBy: Auto-tracked via auditPlugin
 * - timestamps: createdAt, updatedAt from Mongoose
 */
import { Schema, model, models, InferSchemaType, Model } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

const HelpArticleSchema = new Schema(
  {
    slug: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED"],
      default: "PUBLISHED",
    },
    routeHints: { type: [String], default: [] },
    locale: { type: String, enum: ["en", "ar"], default: "en" },
    roles: { type: [String], default: [] },
  },
  { timestamps: true },
);

// Apply plugins BEFORE indexes
HelpArticleSchema.plugin(tenantIsolationPlugin);
HelpArticleSchema.plugin(auditPlugin);

// Tenant-scoped indexes (orgId from plugin)
HelpArticleSchema.index(
  { orgId: 1, slug: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } },
);
HelpArticleSchema.index({
  orgId: 1,
  title: "text",
  content: "text",
  tags: "text",
});
HelpArticleSchema.index({ orgId: 1, locale: 1 });
HelpArticleSchema.index({ orgId: 1, roles: 1 });
HelpArticleSchema.index({ orgId: 1, status: 1 });

export type HelpArticleDoc = InferSchemaType<typeof HelpArticleSchema>;

// Export model with singleton pattern for production, recreation for tests
export const HelpArticle: Model<HelpArticleDoc> = getModel<HelpArticleDoc>(
  "HelpArticle",
  HelpArticleSchema,
);
