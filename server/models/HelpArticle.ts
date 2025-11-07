import { Schema, model, models, InferSchemaType } from "mongoose";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

const HelpArticleSchema = new Schema({
  slug: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String },
  tags: { type: [String], default: [] },
  status: { type: String, enum: ["DRAFT", "PUBLISHED"], default: "PUBLISHED" },
  routeHints: { type: [String], default: [] },
  locale: { type: String, enum: ["en", "ar"], default: "en" },
  roles: { type: [String], default: [] }
}, { timestamps: true });

// Apply plugins BEFORE indexes
HelpArticleSchema.plugin(tenantIsolationPlugin);
HelpArticleSchema.plugin(auditPlugin);

// Tenant-scoped indexes (orgId from plugin)
HelpArticleSchema.index({ orgId: 1, slug: 1 }, { unique: true });
HelpArticleSchema.index({ orgId: 1, title: "text", content: "text", tags: "text" });
HelpArticleSchema.index({ orgId: 1, locale: 1 });
HelpArticleSchema.index({ orgId: 1, roles: 1 });
HelpArticleSchema.index({ orgId: 1, status: 1 });

export type HelpArticleDoc = InferSchemaType<typeof HelpArticleSchema>;

// Export model with proper cache handling for tests
// In test environment, allow fresh model creation; in production use singleton
export const HelpArticle = (() => {
  // If model already exists, delete and recreate to pick up any schema changes
  // This is essential for test environments where schemas may be modified
  if (models.HelpArticle) {
    // In test: force recreation to pick up fresh schema with plugins
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      delete models.HelpArticle;
      return model("HelpArticle", HelpArticleSchema);
    }
    return models.HelpArticle;
  }
  return model("HelpArticle", HelpArticleSchema);
})();
