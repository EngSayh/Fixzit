import { Schema, InferSchemaType } from "mongoose";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";
import { getModel } from "@/types/mongoose-compat";
import { BRAND_COLORS } from "@/lib/config/brand-colors";

/**
 * @module server/models/PlatformSettings
 * @description Platform Settings model for global branding and configuration.
 * Manages logo, favicon, brand colors, and platform name. Super Admin only.
 *
 * @features
 * - Logo upload and storage (URL, storage key, MIME type, file size)
 * - Favicon management
 * - Brand name customization (default: "Fixzit Enterprise")
 * - Brand color configuration (default: #0061A8 Business.sa blue)
 * - Tenant isolation (tenantIsolationPlugin for multi-org support)
 * - Audit trail for settings changes (auditPlugin)
 * - Super Admin access control (modification restricted)
 * - Cloud storage integration for logo/favicon
 *
 * @indexes
 * - { tenantId: 1 } (from tenantIsolationPlugin) - Tenant-scoped settings
 *
 * @relationships
 * - Organization: tenantId references tenant (from plugin)
 * - User: updatedBy/createdBy (from auditPlugin)
 *
 * @compliance
 * - Super Admin only modifications
 * - Audit trail for branding changes
 *
 * @audit
 * - createdAt/updatedAt: Settings lifecycle (from timestamps)
 * - createdBy/updatedBy: Admin actions (from auditPlugin)
 *
 * PlatformSettings Model (legacy comment retained below)
 * Manages global platform settings including logo, branding, etc.
 * Super Admin only access for modifications
 */
const PlatformSettingsSchema = new Schema(
  {
    // tenantId will be added by tenantIsolationPlugin
    logoUrl: {
      type: String,
      required: false,
      comment: "URL to the platform logo (stored in cloud storage or local)",
    },
    logoStorageKey: {
      type: String,
      required: false,
      comment: "Storage key/path for the logo file",
    },
    logoFileName: {
      type: String,
      required: false,
      comment: "Original filename of the uploaded logo",
    },
    logoMimeType: {
      type: String,
      required: false,
      comment: "MIME type of the logo (e.g., image/png, image/jpeg)",
    },
    logoFileSize: {
      type: Number,
      required: false,
      comment: "File size in bytes",
    },
    faviconUrl: {
      type: String,
      required: false,
      comment: "URL to the favicon",
    },
    brandName: {
      type: String,
      default: "Fixzit Enterprise",
      comment: "Platform brand name",
    },
    brandColor: {
      type: String,
      default: BRAND_COLORS.primary,
      comment: "Primary brand color (hex format) - Business.sa blue",
    },
    // updatedBy, updatedAt, createdBy, createdAt will be added by auditPlugin
  },
  {
    timestamps: true,
    comment: "Platform-wide settings including branding and logo",
  },
);

// Apply plugins BEFORE indexes
PlatformSettingsSchema.plugin(tenantIsolationPlugin);
PlatformSettingsSchema.plugin(auditPlugin);

// Ensure only one settings document per tenant (singleton pattern)
PlatformSettingsSchema.index(
  { orgId: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } },
);

export type PlatformSettingsDoc = InferSchemaType<
  typeof PlatformSettingsSchema
>;

export const PlatformSettings = getModel<PlatformSettingsDoc>(
  "PlatformSettings",
  PlatformSettingsSchema,
);
