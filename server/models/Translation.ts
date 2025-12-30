/**
 * @fileoverview Translation MongoDB Model
 * @description Manages i18n translation keys and values
 * @module server/models/Translation
 * @agent [AGENT-001-A]
 */

import mongoose, { Schema, Document, Model } from "mongoose";
import { auditPlugin } from "../plugins/auditPlugin";

export interface ITranslation extends Document {
  _id: mongoose.Types.ObjectId;
  key: string; // e.g., "common.buttons.save", "dashboard.welcome.title"
  namespace: string; // e.g., "common", "dashboard", "errors"
  context?: string; // Additional context for translators
  values: {
    en: string;
    ar: string;
    [locale: string]: string;
  };
  status: "draft" | "pending_review" | "approved" | "published";
  category?: string; // UI grouping: "buttons", "labels", "messages", "errors"
  isRTL?: boolean; // Override RTL detection
  pluralForms?: {
    en?: {
      zero?: string;
      one?: string;
      two?: string;
      few?: string;
      many?: string;
      other?: string;
    };
    ar?: {
      zero?: string;
      one?: string;
      two?: string;
      few?: string;
      many?: string;
      other?: string;
    };
  };
  variables?: string[]; // List of variables used: ["name", "count"]
  tags?: string[];
  isSystem: boolean; // System translations cannot be deleted
  lastEditedBy?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TranslationSchema = new Schema<ITranslation>(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    namespace: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
      default: "common",
    },
    context: {
      type: String,
      maxlength: 500,
    },
    values: {
      type: Schema.Types.Mixed,
      required: true,
      default: { en: "", ar: "" },
    },
    status: {
      type: String,
      enum: ["draft", "pending_review", "approved", "published"],
      default: "draft",
    },
    category: {
      type: String,
      maxlength: 50,
    },
    isRTL: {
      type: Boolean,
    },
    pluralForms: {
      type: Schema.Types.Mixed,
    },
    variables: [{
      type: String,
      maxlength: 50,
    }],
    tags: [{
      type: String,
      maxlength: 50,
    }],
    isSystem: {
      type: Boolean,
      default: false,
    },
    lastEditedBy: {
      type: String,
    },
    approvedBy: {
      type: String,
    },
    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "translations",
  }
);

// Indexes
TranslationSchema.index({ key: 1, namespace: 1 }, { unique: true });
TranslationSchema.index({ namespace: 1 });
TranslationSchema.index({ status: 1 });
TranslationSchema.index({ category: 1 });
TranslationSchema.index({ tags: 1 });
TranslationSchema.index({ key: "text", "values.en": "text", "values.ar": "text" });

// Audit plugin
TranslationSchema.plugin(auditPlugin);

// Export model
export const Translation: Model<ITranslation> =
  mongoose.models.Translation ||
  mongoose.model<ITranslation>("Translation", TranslationSchema);
