import { Schema, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { auditPlugin } from "../plugins/auditPlugin";

/**
 * @module server/models/SubscriptionTier
 * @description Subscription Tier model for platform-wide pricing tiers.
 * Manages subscription plans (Free, Basic, Pro, Enterprise) with features and limits.
 * Super Admin only access for CRUD operations.
 *
 * @features
 * - Tier name and display name (bilingual)
 * - Monthly and annual pricing
 * - Feature list and usage limits
 * - Active/inactive status for soft-delete
 * - Sort order for UI display
 *
 * @indexes
 * - { name: 1 } - Unique tier identifier
 * - { isActive: 1, sortOrder: 1 } - Active tiers list query
 *
 * @audit
 * - createdAt/updatedAt: Tier lifecycle (from timestamps)
 * - createdBy/updatedBy: Admin actions (from auditPlugin)
 */

const LimitsSchema = new Schema(
  {
    users: { type: Number, default: -1, comment: "Max users, -1 = unlimited" },
    storage: { type: Number, default: -1, comment: "Max storage in GB, -1 = unlimited" },
    apiCalls: { type: Number, default: -1, comment: "Max API calls/month, -1 = unlimited" },
    properties: { type: Number, default: -1, comment: "Max properties, -1 = unlimited" },
    workOrders: { type: Number, default: -1, comment: "Max work orders/month, -1 = unlimited" },
  },
  { _id: false }
);

const SubscriptionTierSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      enum: ["free", "basic", "pro", "enterprise", "custom"],
      comment: "Internal tier name identifier",
    },
    displayName: {
      type: String,
      required: true,
      comment: "Display name in English",
    },
    displayNameAr: {
      type: String,
      comment: "Display name in Arabic",
    },
    description: {
      type: String,
      comment: "Tier description in English",
    },
    descriptionAr: {
      type: String,
      comment: "Tier description in Arabic",
    },
    monthlyPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      comment: "Monthly price in default currency",
    },
    annualPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      comment: "Annual price in default currency (usually discounted)",
    },
    currency: {
      type: String,
      default: "SAR",
      uppercase: true,
      match: [/^[A-Z]{3}$/, "Currency must be a valid ISO 4217 code"],
    },
    features: {
      type: [String],
      default: [],
      comment: "List of features included in this tier",
    },
    featuresAr: {
      type: [String],
      default: [],
      comment: "List of features in Arabic",
    },
    limits: {
      type: LimitsSchema,
      default: () => ({}),
      comment: "Usage limits for this tier",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
      comment: "Whether the tier is available for new subscriptions",
    },
    isPopular: {
      type: Boolean,
      default: false,
      comment: "Whether to highlight this tier as popular/recommended",
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
      comment: "Display order in UI (lower = first)",
    },
    // createdBy, updatedBy, createdAt, updatedAt handled by plugins
  },
  {
    timestamps: true,
    collection: "subscription_tiers",
    comment: "Platform subscription tier definitions",
  }
);

// Apply audit plugin for tracking changes
// SUPER_ADMIN: Platform-wide model, createdBy optional for system seeding
SubscriptionTierSchema.plugin(auditPlugin, { createdByOptional: true });

// Compound index for active tiers sorted by order
SubscriptionTierSchema.index({ isActive: 1, sortOrder: 1 });

export type SubscriptionTierDoc = InferSchemaType<typeof SubscriptionTierSchema>;

export const SubscriptionTier = getModel<SubscriptionTierDoc>(
  "SubscriptionTier",
  SubscriptionTierSchema
);
