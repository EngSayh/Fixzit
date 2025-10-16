import { Schema, model, models, InferSchemaType } from "mongoose";

const HelpArticleSchema = new Schema({
  tenantId: { type: String, required: true },
  slug: { type:String, required:true },
  title: { type:String, required:true },
  content: { type:String, required:true },
  category: { type:String },
  tags: { type: [String], default: [] },
  status: { type:String, enum:["DRAFT","PUBLISHED"], default:"PUBLISHED" },
  routeHints: { type:[String], default: [] },
  updatedBy: { type:String },
  updatedAt: { type:Date, default: Date.now }
}, { timestamps:true });

// Ensure slug uniqueness is scoped to tenant
HelpArticleSchema.index({ tenantId: 1, slug: 1 }, { unique: true });

HelpArticleSchema.index({ title:"text", content:"text", tags:"text" });

export type HelpArticleDoc = InferSchemaType<typeof HelpArticleSchema>;

// Check if we're using mock database
export const HelpArticle = models.HelpArticle || model("HelpArticle", HelpArticleSchema);
