import { Schema, InferSchemaType } from "mongoose";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";
import { getModel } from "@/types/mongoose-compat";

/**
 * PlatformSettings Model
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
      default: "#3b82f6",
      comment: "Primary brand color (hex format)",
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
