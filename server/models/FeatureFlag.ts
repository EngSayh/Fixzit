import { Schema, InferSchemaType } from "mongoose";
import { logger } from "@/lib/logger";
import {
  tenantIsolationPlugin,
  withoutTenantFilter,
} from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";
import { getModel } from "@/types/mongoose-compat";

const FeatureStatus = ["ENABLED", "DISABLED", "BETA", "DEPRECATED"] as const;
const FeatureCategory = [
  "UI",
  "BACKEND",
  "API",
  "INTEGRATION",
  "SECURITY",
  "PAYMENT",
  "NOTIFICATION",
  "REPORTING",
  "MAINTENANCE",
  "OTHER",
] as const;

const RolloutStrategy = [
  "ALL",
  "PERCENTAGE",
  "WHITELIST",
  "BLACKLIST",
] as const;

const FeatureFlagSchema = new Schema(
  {
    // Multi-tenancy - will be added by plugin
    // orgId: { type: String, required: true, index: true },

    // Basic Information
    key: { type: String, required: true, uppercase: true }, // e.g., "ENABLE_REFERRAL_PROGRAM"
    name: { type: String, required: true }, // Human-readable name
    description: String,
    category: { type: String, enum: FeatureCategory, required: true },

    // Status
    status: { type: String, enum: FeatureStatus, default: "DISABLED" },
    isGlobal: { type: Boolean, default: false }, // If true, applies to all tenants

    // Rollout Configuration
    rollout: {
      strategy: { type: String, enum: RolloutStrategy, default: "ALL" },
      percentage: { type: Number, min: 0, max: 100, default: 100 }, // For gradual rollout
      whitelistedUsers: [String], // User IDs
      whitelistedOrgs: [String], // Organization IDs
      blacklistedUsers: [String],
      blacklistedOrgs: [String],
      startDate: Date,
      endDate: Date,
    },

    // Environment Configuration
    environments: {
      development: { type: Boolean, default: true },
      staging: { type: Boolean, default: true },
      production: { type: Boolean, default: false },
    },

    // Dependencies
    dependencies: {
      requires: [String], // Feature keys that must be enabled
      conflicts: [String], // Feature keys that must be disabled
      replaces: String, // Feature key this replaces
    },

    // Configuration Values (for features with settings)
    config: {
      values: Schema.Types.Mixed, // JSON object with feature-specific config
      schema: Schema.Types.Mixed, // JSON schema for validation
      defaults: Schema.Types.Mixed,
    },

    // Access Control
    access: {
      roles: [String], // Which roles can use this feature
      permissions: [String], // Required permissions
      subscriptionTiers: [String], // BASIC, PREMIUM, ENTERPRISE
      minUserLevel: Number, // Minimum user level required
    },

    // Usage Tracking
    usage: {
      totalChecks: { type: Number, default: 0 },
      enabledChecks: { type: Number, default: 0 },
      disabledChecks: { type: Number, default: 0 },
      uniqueUsers: { type: Number, default: 0 },
      lastCheckedAt: Date,
      firstUsedAt: Date,
    },

    // A/B Testing
    abTest: {
      isActive: { type: Boolean, default: false },
      variants: [
        {
          name: String, // A, B, C, etc.
          percentage: Number,
          config: Schema.Types.Mixed,
          metrics: {
            impressions: { type: Number, default: 0 },
            conversions: { type: Number, default: 0 },
            conversionRate: { type: Number, default: 0 },
          },
        },
      ],
      winnerVariant: String,
      endDate: Date,
    },

    // Monitoring
    monitoring: {
      errorRate: { type: Number, default: 0 },
      avgResponseTime: Number, // milliseconds
      alerts: [
        {
          type: {
            type: String,
            enum: ["ERROR_THRESHOLD", "USAGE_SPIKE", "PERFORMANCE"],
          },
          threshold: Number,
          recipients: [String],
          triggered: Boolean,
          lastTriggeredAt: Date,
        },
      ],
    },

    // Metadata
    metadata: {
      owner: String, // Team or person responsible
      jiraTicket: String,
      documentation: String, // URL to docs
      tags: [String],
      priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
      estimatedImpact: String,
    },

    // Lifecycle
    lifecycle: {
      createdBy: String,
      enabledBy: String,
      enabledAt: Date,
      disabledBy: String,
      disabledAt: Date,
      deprecatedAt: Date,
      removalScheduledFor: Date,
      changeLog: [
        {
          date: Date,
          user: String,
          action: String, // ENABLED, DISABLED, CONFIG_CHANGED, etc.
          oldValue: Schema.Types.Mixed,
          newValue: Schema.Types.Mixed,
          reason: String,
        },
      ],
    },

    // Testing
    testing: {
      hasTests: Boolean,
      testCoverage: Number, // percentage
      lastTestedAt: Date,
      testResults: String, // URL or summary
    },

    // Notes
    notes: String,
    warnings: [String], // Important warnings for admins

    // Timestamps managed by plugin
  },
  {
    timestamps: true,
  },
);

// Plugins (apply first so orgId exists for indexes)
FeatureFlagSchema.plugin(tenantIsolationPlugin);
FeatureFlagSchema.plugin(auditPlugin);

// Indexes (tenant-aware after plugins)
FeatureFlagSchema.index(
  { orgId: 1, key: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } },
);
FeatureFlagSchema.index({ orgId: 1, status: 1 });
FeatureFlagSchema.index({ orgId: 1, category: 1 });
FeatureFlagSchema.index({ isGlobal: 1 });
FeatureFlagSchema.index({ "rollout.whitelistedOrgs": 1 });
FeatureFlagSchema.index({ "rollout.startDate": 1, "rollout.endDate": 1 });

// Static method to check if feature is enabled
FeatureFlagSchema.statics.isEnabled = async function (
  key: string,
  context: {
    userId?: string;
    orgId?: string;
    role?: string;
    environment?: string;
  },
) {
  // Try tenant-scoped lookup first
  let feature = await this.findOne({ key });

  // Fallback to global flags if not found
  if (!feature) {
    feature = await withoutTenantFilter(async () =>
      this.findOne({ key, isGlobal: true }),
    );
  }

  if (!feature) return false;
  if (feature.status !== "ENABLED") return false;

  // Check environment
  const env = context.environment || process.env.NODE_ENV || "development";
  if (!feature.environments[env]) return false;

  // Check dates
  const now = new Date();
  if (feature.rollout.startDate && now < feature.rollout.startDate)
    return false;
  if (feature.rollout.endDate && now > feature.rollout.endDate) return false;

  // Check rollout strategy
  switch (feature.rollout.strategy) {
    case "ALL":
      return true;

    case "WHITELIST":
      if (
        context.userId &&
        Array.isArray(feature.rollout.whitelistedUsers) &&
        feature.rollout.whitelistedUsers.includes(context.userId)
      )
        return true;
      if (
        context.orgId &&
        Array.isArray(feature.rollout.whitelistedOrgs) &&
        feature.rollout.whitelistedOrgs.includes(context.orgId)
      )
        return true;
      return false;

    case "BLACKLIST":
      if (
        context.userId &&
        Array.isArray(feature.rollout.blacklistedUsers) &&
        feature.rollout.blacklistedUsers.includes(context.userId)
      )
        return false;
      if (
        context.orgId &&
        Array.isArray(feature.rollout.blacklistedOrgs) &&
        feature.rollout.blacklistedOrgs.includes(context.orgId)
      )
        return false;
      return true;

    case "PERCENTAGE": {
      // Validate percentage exists and is valid
      const percentage = feature.rollout?.percentage;
      if (
        typeof percentage !== "number" ||
        percentage < 0 ||
        percentage > 100
      ) {
        // Structured logging for invalid percentage
        logger.warn("[FeatureFlag] Invalid or missing percentage", {
          feature: key,
          percentage,
          timestamp: new Date().toISOString(),
        });
        return false;
      }

      // Simple hash-based percentage rollout - deterministic based on userId or orgId
      let hash: number;
      if (context.userId) {
        hash = hashCode(context.userId);
      } else if (context.orgId) {
        hash = hashCode(context.orgId);
      } else {
        // No deterministic identifier available, default to disabled
        logger.warn(
          "[FeatureFlag] No userId or orgId provided for PERCENTAGE rollout",
          {
            feature: key,
            timestamp: new Date().toISOString(),
          },
        );
        return false;
      }
      return Math.abs(hash) % 100 < percentage;
    }

    default:
      return false;
  }
};

// Static method to get feature config
FeatureFlagSchema.statics.getConfig = async function (key: string) {
  // Try tenant-scoped lookup first
  let feature = await this.findOne({ key });

  // Fallback to global flags if not found
  if (!feature) {
    feature = await withoutTenantFilter(async () =>
      this.findOne({ key, isGlobal: true }),
    );
  }

  if (!feature) return null;
  return feature.config?.values ?? feature.config?.defaults ?? {};
};

// Static method to record usage
// Note: uniqueUsers tracking requires userId to be passed if needed
// Currently only tracking check counts and timestamps
FeatureFlagSchema.statics.recordUsage = async function (
  key: string,
  enabled: boolean,
  userId?: string,
) {
  interface UpdateOps {
    $inc: {
      "usage.totalChecks": number;
      "usage.enabledChecks"?: number;
      "usage.disabledChecks"?: number;
      "usage.uniqueUsers"?: number;
    };
    $set: {
      "usage.lastCheckedAt": Date;
    };
  }

  const updateOps: UpdateOps = {
    $inc: {
      "usage.totalChecks": 1,
      ...(enabled
        ? { "usage.enabledChecks": 1 }
        : { "usage.disabledChecks": 1 }),
    },
    $set: {
      "usage.lastCheckedAt": new Date(),
    },
  };

  // Track unique users if userId provided
  // Using $addToSet would require storing user IDs, which could grow large
  // For now, we increment uniqueUsers counter when userId is provided
  // Note: This is an approximation and may count same user multiple times
  // For accurate tracking, consider using a separate collection or Redis set
  if (userId) {
    updateOps.$inc["usage.uniqueUsers"] = 1;
  }

  // Try tenant-scoped update first
  const result = await this.updateOne({ key }, updateOps);

  // If no document was updated, try global flags
  if (result.matchedCount === 0) {
    await withoutTenantFilter(async () =>
      this.updateOne({ key, isGlobal: true }, updateOps),
    );
  }
};

// Helper function for percentage rollout
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash | 0; // Convert to 32bit integer
  }
  return hash;
}

// Virtual for rollout percentage
FeatureFlagSchema.virtual("effectiveRolloutPercent").get(function () {
  if (this.status !== "ENABLED") return 0;
  if (!this.rollout) return 0;
  if (this.rollout.strategy === "ALL") return 100;
  if (this.rollout.strategy === "PERCENTAGE")
    return this.rollout.percentage || 0;
  return 0;
});

// Method to toggle feature
FeatureFlagSchema.methods.toggle = async function (
  userId: string,
  reason?: string,
) {
  const newStatus = this.status === "ENABLED" ? "DISABLED" : "ENABLED";

  // Initialize lifecycle.changeLog if it doesn't exist
  if (!this.lifecycle) {
    this.lifecycle = { changeLog: [] };
  }
  if (!Array.isArray(this.lifecycle.changeLog)) {
    this.lifecycle.changeLog = [];
  }

  this.lifecycle.changeLog.push({
    date: new Date(),
    user: userId,
    action: newStatus,
    oldValue: this.status,
    newValue: newStatus,
    reason: reason || "Manual toggle",
  });

  this.status = newStatus;

  if (newStatus === "ENABLED") {
    this.lifecycle.enabledBy = userId;
    this.lifecycle.enabledAt = new Date();
  } else {
    this.lifecycle.disabledBy = userId;
    this.lifecycle.disabledAt = new Date();
  }

  await this.save();
};

// Export type and model
export type FeatureFlag = InferSchemaType<typeof FeatureFlagSchema>;

// Define static methods interface
export interface FeatureFlagStaticMethods {
  isEnabled(
    key: string,
    context: {
      userId?: string;
      orgId?: string;
      role?: string;
      environment?: string;
    },
  ): Promise<boolean>;
  getConfig(key: string): Promise<Record<string, unknown> | null>;
  recordUsage(key: string, enabled: boolean): Promise<void>;
}

// Type the model with statics
export type FeatureFlagModelType = import("mongoose").Model<FeatureFlag> &
  FeatureFlagStaticMethods;

export const FeatureFlagModel: FeatureFlagModelType = getModel<
  FeatureFlag,
  FeatureFlagModelType
>("FeatureFlag", FeatureFlagSchema);
