import { Schema, model, models, InferSchemaType, Model } from "mongoose";
import { getModel, MModel } from "@/src/types/mongoose-compat";
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
HelpArticleSchema.index({ orgId: 1, slug: 1 }, { unique: true });
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
