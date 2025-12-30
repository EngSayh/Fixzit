import { Schema, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { auditPlugin } from "../plugins/auditPlugin";

/**
 * @module server/models/FooterLink
 * @description Footer Link model for navigation links in site footer.
 * Organizes links by section (company, support, legal, social).
 * Super Admin only access for CRUD operations.
 *
 * @features
 * - Bilingual labels (English and Arabic)
 * - Section-based organization
 * - External link support with icon
 * - Active/inactive for visibility control
 * - Sort order within each section
 *
 * @indexes
 * - { section: 1, sortOrder: 1 } - Section links list query
 * - { isActive: 1 } - Active links filter
 *
 * @audit
 * - createdAt/updatedAt: Link lifecycle (from timestamps)
 * - createdBy/updatedBy: Admin actions (from auditPlugin)
 */

const FooterLinkSchema = new Schema(
  {
    label: {
      type: String,
      required: true,
      maxlength: 100,
      comment: "Link text in English",
    },
    labelAr: {
      type: String,
      maxlength: 100,
      comment: "Link text in Arabic",
    },
    url: {
      type: String,
      required: true,
      comment: "Link destination URL (relative or absolute)",
    },
    section: {
      type: String,
      required: true,
      enum: ["company", "support", "legal", "social"],
      index: true,
      comment: "Footer section this link belongs to",
    },
    icon: {
      type: String,
      comment: "Icon name for social links (e.g., twitter, facebook)",
    },
    isExternal: {
      type: Boolean,
      default: false,
      comment: "Whether link opens in new tab",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
      comment: "Whether the link is visible",
    },
    sortOrder: {
      type: Number,
      default: 0,
      comment: "Display order within section (lower = first)",
    },
    // createdBy, updatedBy, createdAt, updatedAt handled by auditPlugin
  },
  {
    timestamps: true,
    collection: "footer_links",
    comment: "Site footer navigation links",
  }
);

// Apply audit plugin for tracking changes
FooterLinkSchema.plugin(auditPlugin);

// Compound index for section listing
FooterLinkSchema.index({ section: 1, sortOrder: 1 });

// Index for active links filter
FooterLinkSchema.index({ isActive: 1, sortOrder: 1 });

export type FooterLinkDoc = InferSchemaType<typeof FooterLinkSchema>;

export const FooterLink = getModel<FooterLinkDoc>(
  "FooterLink",
  FooterLinkSchema
);
