/**
 * Feature Flags Configuration System
 *
 * Centralized feature flag management for the Fixzit platform.
 * Consolidates all feature toggles in one place for better maintainability.
 *
 * @module lib/config/feature-flags
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * All available feature flags in the system
 */
export interface FeatureFlags {
  // Core Features
  multiLanguage: boolean;
  smsNotifications: boolean;
  emailNotifications: boolean;
  mfaRequired: boolean;

  // Module Features
  graphqlApi: boolean;
  marketplace: boolean;
  applicantTracking: boolean;
  crmModule: boolean;
  complianceModule: boolean;

  // Integration Features
  tapPayments: boolean;
  paytabsPayments: boolean;
  taqnyatSms: boolean;
  awsS3: boolean;
  openTelemetry: boolean;
  sentryErrorTracking: boolean;

  // Development Features
  debugMode: boolean;
  mockPayments: boolean;
  seedDatabase: boolean;

  // Performance Features
  redisCache: boolean;
  edgeCaching: boolean;
  imageOptimization: boolean;

  // Security Features
  rateLimiting: boolean;
  csrfProtection: boolean;
  auditLogging: boolean;
}

/**
 * Feature flag metadata for documentation
 */
export interface FeatureFlagMeta {
  name: keyof FeatureFlags;
  description: string;
  envVar: string;
  defaultValue: boolean;
  category: "core" | "module" | "integration" | "development" | "performance" | "security";
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Feature flag definitions with metadata
 */
export const FEATURE_FLAG_DEFINITIONS: FeatureFlagMeta[] = [
  // Core Features
  {
    name: "multiLanguage",
    description: "Enable multi-language support (EN/AR)",
    envVar: "FEATURE_MULTI_LANGUAGE",
    defaultValue: true,
    category: "core",
  },
  {
    name: "smsNotifications",
    description: "Enable SMS notifications via Taqnyat",
    envVar: "FEATURE_SMS_NOTIFICATIONS",
    defaultValue: true,
    category: "core",
  },
  {
    name: "emailNotifications",
    description: "Enable email notifications",
    envVar: "FEATURE_EMAIL_NOTIFICATIONS",
    defaultValue: true,
    category: "core",
  },
  {
    name: "mfaRequired",
    description: "Require multi-factor authentication",
    envVar: "FEATURE_MFA_REQUIRED",
    defaultValue: false,
    category: "core",
  },

  // Module Features
  {
    name: "graphqlApi",
    description: "Enable GraphQL API endpoint",
    envVar: "FEATURE_INTEGRATIONS_GRAPHQL_API",
    defaultValue: false,
    category: "module",
  },
  {
    name: "marketplace",
    description: "Enable Souq marketplace module",
    envVar: "FEATURE_MARKETPLACE",
    defaultValue: true,
    category: "module",
  },
  {
    name: "applicantTracking",
    description: "Enable ATS (Applicant Tracking System)",
    envVar: "FEATURE_ATS",
    defaultValue: true,
    category: "module",
  },
  {
    name: "crmModule",
    description: "Enable CRM module",
    envVar: "FEATURE_CRM",
    defaultValue: true,
    category: "module",
  },
  {
    name: "complianceModule",
    description: "Enable compliance tracking module",
    envVar: "FEATURE_COMPLIANCE",
    defaultValue: true,
    category: "module",
  },

  // Integration Features
  {
    name: "tapPayments",
    description: "Enable TAP payment gateway",
    envVar: "FEATURE_TAP_PAYMENTS",
    defaultValue: true,
    category: "integration",
  },
  {
    name: "paytabsPayments",
    description: "Enable PayTabs payment gateway",
    envVar: "FEATURE_PAYTABS_PAYMENTS",
    defaultValue: true,
    category: "integration",
  },
  {
    name: "taqnyatSms",
    description: "Enable Taqnyat SMS provider",
    envVar: "FEATURE_TAQNYAT_SMS",
    defaultValue: true,
    category: "integration",
  },
  {
    name: "awsS3",
    description: "Enable AWS S3 file storage",
    envVar: "FEATURE_AWS_S3",
    defaultValue: true,
    category: "integration",
  },
  {
    name: "openTelemetry",
    description: "Enable OpenTelemetry tracing",
    envVar: "OTEL_EXPORTER_OTLP_ENDPOINT",
    defaultValue: false,
    category: "integration",
  },
  {
    name: "sentryErrorTracking",
    description: "Enable Sentry error tracking",
    envVar: "SENTRY_DSN",
    defaultValue: false,
    category: "integration",
  },

  // Development Features
  {
    name: "debugMode",
    description: "Enable debug mode logging",
    envVar: "DEBUG",
    defaultValue: false,
    category: "development",
  },
  {
    name: "mockPayments",
    description: "Use mock payment responses",
    envVar: "MOCK_PAYMENTS",
    defaultValue: false,
    category: "development",
  },
  {
    name: "seedDatabase",
    description: "Enable database seeding on startup",
    envVar: "SEED_DATABASE",
    defaultValue: false,
    category: "development",
  },

  // Performance Features
  {
    name: "redisCache",
    description: "Enable Redis caching",
    envVar: "REDIS_URL",
    defaultValue: false,
    category: "performance",
  },
  {
    name: "edgeCaching",
    description: "Enable edge caching for static assets",
    envVar: "FEATURE_EDGE_CACHING",
    defaultValue: true,
    category: "performance",
  },
  {
    name: "imageOptimization",
    description: "Enable Next.js image optimization",
    envVar: "FEATURE_IMAGE_OPTIMIZATION",
    defaultValue: true,
    category: "performance",
  },

  // Security Features
  {
    name: "rateLimiting",
    description: "Enable API rate limiting",
    envVar: "FEATURE_RATE_LIMITING",
    defaultValue: true,
    category: "security",
  },
  {
    name: "csrfProtection",
    description: "Enable CSRF protection",
    envVar: "FEATURE_CSRF_PROTECTION",
    defaultValue: true,
    category: "security",
  },
  {
    name: "auditLogging",
    description: "Enable audit logging for sensitive operations",
    envVar: "FEATURE_AUDIT_LOGGING",
    defaultValue: true,
    category: "security",
  },
];

// ============================================================================
// Feature Flag Resolution
// ============================================================================

/**
 * Parse a boolean from environment variable
 */
function parseEnvBoolean(envVar: string, defaultValue: boolean): boolean {
  const value = process.env[envVar];

  // For flags that check presence (like REDIS_URL, SENTRY_DSN)
  if (envVar.includes("URL") || envVar.includes("DSN") || envVar.includes("ENDPOINT")) {
    return Boolean(value);
  }

  // For explicit true/false flags
  if (value === undefined || value === "") {
    return defaultValue;
  }

  return value === "true" || value === "1" || value === "yes";
}

/**
 * Get all feature flags with current values
 */
export function getFeatureFlags(): FeatureFlags {
  const flags: Partial<FeatureFlags> = {};

  for (const def of FEATURE_FLAG_DEFINITIONS) {
    flags[def.name] = parseEnvBoolean(def.envVar, def.defaultValue);
  }

  return flags as FeatureFlags;
}

/**
 * Check if a specific feature is enabled
 *
 * @param feature - Feature name to check
 * @returns Whether the feature is enabled
 *
 * @example
 * ```ts
 * if (isFeatureEnabled("graphqlApi")) {
 *   // GraphQL endpoint is active
 * }
 * ```
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const def = FEATURE_FLAG_DEFINITIONS.find((d) => d.name === feature);
  if (!def) {
    logger.warn(`[FeatureFlags] Unknown feature flag: ${feature}`);
    return false;
  }

  return parseEnvBoolean(def.envVar, def.defaultValue);
}

/**
 * Get feature flags by category
 *
 * @param category - Category to filter by
 * @returns Feature flags in the category
 */
export function getFeatureFlagsByCategory(
  category: FeatureFlagMeta["category"]
): Array<{ name: keyof FeatureFlags; enabled: boolean; description: string }> {
  return FEATURE_FLAG_DEFINITIONS.filter((def) => def.category === category).map((def) => ({
    name: def.name,
    enabled: parseEnvBoolean(def.envVar, def.defaultValue),
    description: def.description,
  }));
}

/**
 * Log current feature flag status (for debugging)
 */
export function logFeatureFlags(): void {
  const flags = getFeatureFlags();
  const enabled = Object.entries(flags)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const disabled = Object.entries(flags)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  logger.info("[FeatureFlags] Current configuration", {
    enabled: enabled.join(", "),
    disabled: disabled.join(", "),
    total: Object.keys(flags).length,
  });
}

// ============================================================================
// Export singleton instance
// ============================================================================

/**
 * Cached feature flags instance
 * Re-evaluated on each call to pick up env changes
 */
export const featureFlags = {
  get flags() {
    return getFeatureFlags();
  },
  isEnabled: isFeatureEnabled,
  getByCategory: getFeatureFlagsByCategory,
  definitions: FEATURE_FLAG_DEFINITIONS,
  log: logFeatureFlags,
};

export default featureFlags;
