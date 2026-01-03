import { Schema, InferSchemaType } from "mongoose";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";
import { getModel } from "@/types/mongoose-compat";
import { BRAND_COLORS, NEUTRAL_SCALE } from "@/lib/config/brand-colors";

/**
 * @module server/models/PlatformSettings
 * @description Platform Settings model for global branding, theme configuration, and SuperAdmin control.
 * 
 * ⚠️ SINGLE SOURCE OF TRUTH FOR THEME COLORS
 * All theme colors are configurable by SuperAdmin and applied across the entire platform.
 * 
 * @features
 * - Logo upload and storage (URL, storage key, MIME type, file size)
 * - Favicon management
 * - Brand name customization (default: "Fixzit Enterprise")
 * - **FULL THEME CONFIGURATION** (primary, secondary, success, warning, error, info colors)
 * - **NEUTRAL SCALE** (text, backgrounds, borders)
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
 * - Ejar.sa Design System (Saudi Platforms Code)
 *
 * @audit
 * - createdAt/updatedAt: Settings lifecycle (from timestamps)
 * - createdBy/updatedBy: Admin actions (from auditPlugin)
 */

/**
 * Theme Colors Sub-Schema
 * Defines the complete color palette for the platform
 */
const ThemeColorsSchema = new Schema(
  {
    // Primary Colors (Green - Ejar brand)
    primary: { type: String, default: BRAND_COLORS.primary },
    primaryHover: { type: String, default: BRAND_COLORS.primaryHover },
    primaryActive: { type: String, default: BRAND_COLORS.primaryDark },
    primaryLight: { type: String, default: BRAND_COLORS.primaryLight },
    
    // Secondary Colors (Gold accent)
    secondary: { type: String, default: BRAND_COLORS.secondary },
    secondaryHover: { type: String, default: BRAND_COLORS.secondaryHover },
    
    // Semantic Colors
    success: { type: String, default: BRAND_COLORS.success },
    successLight: { type: String, default: "#ECFDF5" },
    warning: { type: String, default: BRAND_COLORS.warning },
    warningLight: { type: String, default: "#FFFAEB" },
    error: { type: String, default: BRAND_COLORS.error },
    errorLight: { type: String, default: "#FEF3F2" },
    info: { type: String, default: BRAND_COLORS.info },
    infoLight: { type: String, default: "#EFF8FF" },
    
    // Neutral Scale
    neutral50: { type: String, default: NEUTRAL_SCALE[50] },
    neutral100: { type: String, default: NEUTRAL_SCALE[100] },
    neutral200: { type: String, default: NEUTRAL_SCALE[200] },
    neutral300: { type: String, default: NEUTRAL_SCALE[300] },
    neutral400: { type: String, default: NEUTRAL_SCALE[400] },
    neutral500: { type: String, default: NEUTRAL_SCALE[500] },
    neutral600: { type: String, default: NEUTRAL_SCALE[600] },
    neutral700: { type: String, default: NEUTRAL_SCALE[700] },
    neutral800: { type: String, default: NEUTRAL_SCALE[800] },
    neutral900: { type: String, default: NEUTRAL_SCALE[900] },
    neutral950: { type: String, default: NEUTRAL_SCALE[950] },
    
    // Special Colors
    sidebarBg: { type: String, default: NEUTRAL_SCALE[950] },
    footerBg: { type: String, default: NEUTRAL_SCALE[950] },
    headerBg: { type: String, default: BRAND_COLORS.primary },
    
    // Additional brand colors
    lavender: { type: String, default: BRAND_COLORS.lavender },
    saudiGreen: { type: String, default: BRAND_COLORS.saudiGreen },
  },
  { _id: false },
);

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
    // Legacy brandColor - kept for backward compatibility
    brandColor: {
      type: String,
      default: BRAND_COLORS.primary,
      comment: "Primary brand color (hex format) - kept for backward compatibility",
    },
    // Full theme configuration - SuperAdmin editable
    theme: {
      type: ThemeColorsSchema,
      default: () => ({}),
      comment: "Complete theme color configuration - editable by SuperAdmin",
    },
    // updatedBy, updatedAt, createdBy, createdAt will be added by auditPlugin
  },
  {
    timestamps: true,
    comment: "Platform-wide settings including branding, logo, and theme colors",
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
