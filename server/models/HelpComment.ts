/**
 * @module server/models/HelpComment
 * @description User comments on help articles for feedback and community assistance.
 *              Supports tenant isolation and pagination.
 *
 * @features
 * - Linked to articles via articleSlug (not ObjectId for flexibility)
 * - Tenant-scoped via orgId
 * - User attribution via userId
 * - Character limit: 1-2000 chars
 *
 * @indexes
 * - { articleSlug: 1, createdAt: -1 } — Paginated comments per article
 * - { orgId: 1, articleSlug: 1 } — Tenant-scoped article lookup
 * - { userId: 1, createdAt: -1 } — User's comment history
 *
 * @relationships
 * - articleSlug → HelpArticle.slug (soft reference)
 * - userId → User._id (soft reference)
 * - orgId → Organization._id (tenant isolation)
 *
 * TD-001: Created to migrate db.collection() calls to Mongoose
 */
import { Schema, Model, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";

const HelpCommentSchema = new Schema(
  {
    articleSlug: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    comment: { type: String, required: true, minlength: 1, maxlength: 2000 },
  },
  {
    timestamps: true,
    collection: "helpcomments", // Match existing collection name
  },
);

// Apply tenant isolation plugin (adds orgId field and scoping)
HelpCommentSchema.plugin(tenantIsolationPlugin);

// Indexes for efficient queries
HelpCommentSchema.index({ articleSlug: 1, createdAt: -1 });
HelpCommentSchema.index({ orgId: 1, articleSlug: 1 });
HelpCommentSchema.index({ userId: 1, createdAt: -1 });

export type HelpCommentDoc = InferSchemaType<typeof HelpCommentSchema>;

// Export model with singleton pattern
export const HelpComment: Model<HelpCommentDoc> = getModel<HelpCommentDoc>(
  "HelpComment",
  HelpCommentSchema,
);
