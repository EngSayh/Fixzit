import { Schema, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { auditPlugin } from "../plugins/auditPlugin";

/**
 * @module server/models/CompanyInfo
 * @description Company Info model for contact and branding information.
 * Singleton pattern - one record per platform.
 * Super Admin only access for configuration.
 *
 * @features
 * - Company name and tagline (bilingual)
 * - Contact information (email, phone, address)
 * - Business registration details (VAT, CR number)
 * - Social media links
 * - Logo and favicon URLs
 *
 * @audit
 * - createdAt/updatedAt: Info lifecycle (from timestamps)
 * - createdBy/updatedBy: Admin actions (from auditPlugin)
 */

const SocialLinksSchema = new Schema(
  {
    twitter: { type: String },
    facebook: { type: String },
    instagram: { type: String },
    linkedin: { type: String },
    youtube: { type: String },
    tiktok: { type: String },
  },
  { _id: false }
);

const CompanyInfoSchema = new Schema(
  {
    name: {
      type: String,
      default: "Fixzit",
      maxlength: 200,
      comment: "Company name in English",
    },
    nameAr: {
      type: String,
      maxlength: 200,
      comment: "Company name in Arabic",
    },
    tagline: {
      type: String,
      maxlength: 500,
      comment: "Company tagline/slogan in English",
    },
    taglineAr: {
      type: String,
      maxlength: 500,
      comment: "Company tagline/slogan in Arabic",
    },
    email: {
      type: String,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Must be valid email"],
      comment: "Primary contact email",
    },
    phone: {
      type: String,
      maxlength: 20,
      comment: "Primary contact phone",
    },
    alternatePhone: {
      type: String,
      maxlength: 20,
      comment: "Secondary contact phone",
    },
    address: {
      type: String,
      maxlength: 500,
      comment: "Physical address in English",
    },
    addressAr: {
      type: String,
      maxlength: 500,
      comment: "Physical address in Arabic",
    },
    vatNumber: {
      type: String,
      maxlength: 50,
      comment: "VAT registration number",
    },
    crNumber: {
      type: String,
      maxlength: 50,
      comment: "Commercial Registration number",
    },
    logoUrl: {
      type: String,
      comment: "Company logo URL",
    },
    faviconUrl: {
      type: String,
      comment: "Favicon URL",
    },
    socialLinks: {
      type: SocialLinksSchema,
      default: () => ({}),
      comment: "Social media profile URLs",
    },
    // createdBy, updatedBy, createdAt, updatedAt handled by auditPlugin
  },
  {
    timestamps: true,
    collection: "company_info",
    comment: "Company contact and branding information (singleton)",
  }
);

// Apply audit plugin for tracking changes
CompanyInfoSchema.plugin(auditPlugin);

export type CompanyInfoDoc = InferSchemaType<typeof CompanyInfoSchema>;

export const CompanyInfo = getModel<CompanyInfoDoc>(
  "CompanyInfo",
  CompanyInfoSchema
);
