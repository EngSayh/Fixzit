import { Schema, Model, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

/**
 * CompanyInfo Model
 * Manages company information displayed in footer and contact pages
 * Super Admin only access for editing
 * 
 * @module server/models/CompanyInfo
 */
const SocialLinksSchema = new Schema(
  {
    twitter: { type: String, required: false },
    linkedin: { type: String, required: false },
    facebook: { type: String, required: false },
    instagram: { type: String, required: false },
    youtube: { type: String, required: false },
  },
  { _id: false },
);

const CompanyInfoSchema = new Schema(
  {
    // orgId will be added by tenantIsolationPlugin
    name: {
      type: String,
      required: true,
      default: "Fixzit",
      comment: "Company name in English",
    },
    nameAr: {
      type: String,
      required: false,
      comment: "Company name in Arabic",
    },
    tagline: {
      type: String,
      required: false,
      default: "Facility Management Made Simple",
      comment: "Company tagline in English",
    },
    taglineAr: {
      type: String,
      required: false,
      comment: "Company tagline in Arabic",
    },
    email: {
      type: String,
      required: true,
      default: "support@fixzit.sa",
      comment: "Contact email",
    },
    phone: {
      type: String,
      required: false,
      comment: "Contact phone number",
    },
    address: {
      type: String,
      required: false,
      comment: "Physical address in English",
    },
    addressAr: {
      type: String,
      required: false,
      comment: "Physical address in Arabic",
    },
    vatNumber: {
      type: String,
      required: false,
      comment: "VAT registration number",
    },
    crNumber: {
      type: String,
      required: false,
      comment: "Commercial registration number",
    },
    socialLinks: {
      type: SocialLinksSchema,
      default: () => ({}),
      comment: "Social media profile URLs",
    },
    // updatedBy, updatedAt, createdBy, createdAt will be added by auditPlugin
  },
  {
    timestamps: true,
    comment: "Company contact and branding information",
  },
);

// Apply plugins BEFORE indexes
CompanyInfoSchema.plugin(tenantIsolationPlugin);
CompanyInfoSchema.plugin(auditPlugin);

// Ensure only one company info document per tenant (singleton pattern)
CompanyInfoSchema.index(
  { orgId: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } },
);

export type CompanyInfoDoc = InferSchemaType<typeof CompanyInfoSchema>;

export const CompanyInfo: Model<CompanyInfoDoc> = getModel<CompanyInfoDoc>(
  "CompanyInfo",
  CompanyInfoSchema,
);
