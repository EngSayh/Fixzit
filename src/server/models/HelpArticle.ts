import { Schema, model, models, InferSchemaType } from "mongoose";

const HelpArticleSchema = new Schema({
  slug: { type:String, required:true, unique:true },
  title: { type:String, required:true },
  content: { type:String, required:true }, // Markdown
  category: { type:String, index:true },
  tags: { type: [String], default: [], index:true },
  status: { type:String, enum:["DRAFT","PUBLISHED"], default:"PUBLISHED", index:true },
  routeHints: { type:[String], default: [] },
  updatedBy: { type:String },
  updatedAt: { type:Date, default: Date.now }
}, { timestamps:true });

HelpArticleSchema.index({ title:"text", content:"text", tags:"text" });

export type HelpArticleDoc = InferSchemaType<typeof HelpArticleSchema>;

// Check if we're using mock database
export const HelpArticle = models.HelpArticle || model("HelpArticle", HelpArticleSchema);
