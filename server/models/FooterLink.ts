import { Schema, Model, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

/**
 * FooterLink Model
 * Manages footer navigation links organized by section
 * Super Admin only access for editing
 * 
 * @module server/models/FooterLink
 */
const FooterLinkSchema = new Schema(
  {
    // orgId will be added by tenantIsolationPlugin
    label: {
      type: String,
      required: true,
      comment: "Link label in English",
    },
    labelAr: {
      type: String,
      required: false,
      comment: "Link label in Arabic",
    },
    url: {
      type: String,
      required: true,
      comment: "Link URL (internal path or external URL)",
    },
    section: {
      type: String,
      required: true,
      enum: ["company", "support", "legal", "social"],
      comment: "Footer section this link belongs to",
    },
    icon: {
      type: String,
      required: false,
      comment: "Optional icon name (Lucide icon)",
    },
    isExternal: {
      type: Boolean,
      default: false,
      comment: "Whether link opens in new tab",
    },
    isActive: {
      type: Boolean,
      default: true,
      comment: "Whether link is visible in footer",
    },
    sortOrder: {
      type: Number,
      default: 0,
      comment: "Display order within section",
    },
    // updatedBy, updatedAt, createdBy, createdAt will be added by auditPlugin
  },
  {
    timestamps: true,
    comment: "Footer navigation links with section organization",
  },
);

// Apply plugins BEFORE indexes
FooterLinkSchema.plugin(tenantIsolationPlugin);
FooterLinkSchema.plugin(auditPlugin);

// Indexes for efficient queries
FooterLinkSchema.index(
  { orgId: 1, section: 1, sortOrder: 1 },
  { name: "footerlinks_org_section_order" },
);
FooterLinkSchema.index(
  { orgId: 1, isActive: 1 },
  { name: "footerlinks_org_active" },
);

export type FooterLinkDoc = InferSchemaType<typeof FooterLinkSchema>;

export const FooterLink: Model<FooterLinkDoc> = getModel<FooterLinkDoc>(
  "FooterLink",
  FooterLinkSchema,
);
