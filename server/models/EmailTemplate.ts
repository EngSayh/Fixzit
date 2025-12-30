/**
 * EmailTemplate Model - Email template configurations
 * 
 * @module server/models/EmailTemplate
 * @description Email templates for transactional and notification emails.
 * Superadmin can customize email content, subject lines, and branding.
 * 
 * @features
 * - Multi-language templates (EN/AR)
 * - Variable substitution support
 * - Template versioning
 * - Category organization
 * - Active/inactive toggle
 */

import { Schema, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { auditPlugin } from "../plugins/auditPlugin";

const TEMPLATE_CATEGORIES = [
  "auth",           // Password reset, email verification
  "notification",   // General notifications
  "billing",        // Invoices, payment confirmations
  "workorder",      // Work order updates
  "subscription",   // Subscription changes
  "marketing",      // Promotional emails
  "system",         // System alerts
] as const;

const EmailTemplateSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9_-]+$/, "Key must be alphanumeric with underscores/dashes"],
    },
    name: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
    },
    category: {
      type: String,
      enum: TEMPLATE_CATEGORIES,
      required: true,
    },
    subject: {
      type: String,
      required: true,
      maxlength: 500,
    },
    subjectAr: {
      type: String,
      maxlength: 500,
    },
    bodyHtml: {
      type: String,
      required: true,
    },
    bodyHtmlAr: {
      type: String,
    },
    bodyText: {
      type: String,
    },
    bodyTextAr: {
      type: String,
    },
    variables: [{
      name: { type: String, required: true },
      description: { type: String },
      required: { type: Boolean, default: false },
      defaultValue: { type: String },
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    lastTestedAt: {
      type: Date,
      default: null,
    },
    lastTestedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "email_templates",
  }
);

// Audit tracking
EmailTemplateSchema.plugin(auditPlugin);

// Indexes
EmailTemplateSchema.index({ key: 1 }, { unique: true });
EmailTemplateSchema.index({ category: 1, isActive: 1 });
EmailTemplateSchema.index({ createdAt: -1 });

export type EmailTemplateDoc = InferSchemaType<typeof EmailTemplateSchema>;

export const EmailTemplate = getModel<EmailTemplateDoc>(
  "EmailTemplate",
  EmailTemplateSchema
);
export default EmailTemplate;
