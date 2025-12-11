/**
 * Feature Flags System
 *
 * A general-purpose feature flags system for the Fixzit platform.
 * This extends the existing Souq feature flags to support the entire application.
 *
 * @module lib/feature-flags
 * @see lib/souq/feature-flags.ts - Souq-specific feature flags
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Feature flag categories for organization
 */
export type FeatureCategory =
  | "core" // Core platform features
  | "ui" // UI/UX features
  | "finance" // Finance module features
  | "hr" // HR module features
  | "aqar" // Property management features
  | "fm" // Facility management features
  | "souq" // Marketplace features (see lib/souq/feature-flags.ts)
  | "integrations" // Third-party integrations
  | "experimental"; // Experimental/beta features

/**
 * Feature flag definition
 */
export interface FeatureFlag {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description of the feature */
  description: string;
  /** Category for grouping */
  category: FeatureCategory;
  /** Whether enabled by default */
  defaultEnabled: boolean;
  /** Environment-specific overrides */
  environmentOverrides?: {
    development?: boolean;
    staging?: boolean;
    production?: boolean;
  };
  /** Feature dependencies (must be enabled first) */
  dependencies?: string[];
  /** Rollout percentage (0-100) */
  rolloutPercentage?: number;
  /** Allowed organization IDs (if restricted) */
  allowedOrgs?: string[];
  /** Feature sunset date (for deprecation) */
  sunsetDate?: string;
  /** Metadata for tracking */
  metadata?: {
    owner?: string;
    jiraTicket?: string;
    createdAt?: string;
  };
}

/**
 * Feature flag evaluation context
 */
export interface FeatureFlagContext {
  userId?: string;
  orgId?: string;
  roles?: string[];
  environment?: string;
  customAttributes?: Record<string, string | number | boolean>;
}

/**
 * Feature flag store interface (for remote providers)
 */
export interface FeatureFlagStore {
  get(flagId: string): Promise<boolean>;
  getAll(): Promise<Record<string, boolean>>;
  set(flagId: string, enabled: boolean): Promise<void>;
}

// ============================================================================
// Default Feature Flags
// ============================================================================

/**
 * All available feature flags
 */
export const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // Core Features
  "core.dark_mode": {
    id: "core.dark_mode",
    name: "Dark Mode",
    description: "Enable dark mode theme support",
    category: "core",
    defaultEnabled: true,
  },
  "core.multi_language": {
    id: "core.multi_language",
    name: "Multi-Language Support",
    description: "Enable Arabic and English language support",
    category: "core",
    defaultEnabled: true,
  },
  "core.rtl_support": {
    id: "core.rtl_support",
    name: "RTL Layout Support",
    description: "Enable right-to-left layout for Arabic",
    category: "core",
    defaultEnabled: true,
    dependencies: ["core.multi_language"],
  },
  "core.notifications": {
    id: "core.notifications",
    name: "Push Notifications",
    description: "Enable browser push notifications",
    category: "core",
    defaultEnabled: true,
  },
  "core.sms_notifications": {
    id: "core.sms_notifications",
    name: "SMS Notifications",
    description: "Enable SMS notifications via Taqnyat",
    category: "core",
    defaultEnabled: true,
  },

  // UI Features
  "ui.new_dashboard": {
    id: "ui.new_dashboard",
    name: "New Dashboard",
    description: "Enable the redesigned dashboard layout",
    category: "ui",
    defaultEnabled: false,
    rolloutPercentage: 50,
  },
  "ui.compact_tables": {
    id: "ui.compact_tables",
    name: "Compact Tables",
    description: "Use compact table layout for data-dense views",
    category: "ui",
    defaultEnabled: false,
  },
  "ui.ai_assistant": {
    id: "ui.ai_assistant",
    name: "AI Assistant",
    description: "Enable AI-powered assistant in the UI",
    category: "ui",
    defaultEnabled: false,
    environmentOverrides: {
      development: true,
      staging: true,
      production: false,
    },
  },

  // Finance Features
  "finance.auto_invoicing": {
    id: "finance.auto_invoicing",
    name: "Automatic Invoicing",
    description: "Enable automatic invoice generation",
    category: "finance",
    defaultEnabled: true,
  },
  "finance.payment_reminders": {
    id: "finance.payment_reminders",
    name: "Payment Reminders",
    description: "Send automated payment reminder SMS/emails",
    category: "finance",
    defaultEnabled: true,
    dependencies: ["core.sms_notifications"],
  },
  "finance.multi_currency": {
    id: "finance.multi_currency",
    name: "Multi-Currency Support",
    description: "Enable transactions in multiple currencies",
    category: "finance",
    defaultEnabled: false,
  },
  "finance.expense_tracking": {
    id: "finance.expense_tracking",
    name: "Expense Tracking",
    description: "Enable expense tracking and categorization",
    category: "finance",
    defaultEnabled: true,
  },

  // HR Features
  "hr.employee_self_service": {
    id: "hr.employee_self_service",
    name: "Employee Self-Service",
    description: "Allow employees to manage their own data",
    category: "hr",
    defaultEnabled: true,
  },
  "hr.leave_management": {
    id: "hr.leave_management",
    name: "Leave Management",
    description: "Enable leave request and approval workflow",
    category: "hr",
    defaultEnabled: true,
  },
  "hr.payroll": {
    id: "hr.payroll",
    name: "Payroll Module",
    description: "Enable payroll processing features",
    category: "hr",
    defaultEnabled: false,
  },

  // Property Management (Aqar)
  "aqar.virtual_tours": {
    id: "aqar.virtual_tours",
    name: "Virtual Property Tours",
    description: "Enable 360° virtual property tours",
    category: "aqar",
    defaultEnabled: false,
  },
  "aqar.tenant_portal": {
    id: "aqar.tenant_portal",
    name: "Tenant Portal",
    description: "Enable tenant self-service portal",
    category: "aqar",
    defaultEnabled: true,
  },
  "aqar.maintenance_scheduling": {
    id: "aqar.maintenance_scheduling",
    name: "Maintenance Scheduling",
    description: "Enable preventive maintenance scheduling",
    category: "aqar",
    defaultEnabled: true,
  },

  // Facility Management
  "fm.work_order_auto_assign": {
    id: "fm.work_order_auto_assign",
    name: "Auto-Assign Work Orders",
    description: "Automatically assign work orders to vendors",
    category: "fm",
    defaultEnabled: false,
  },
  "fm.sla_tracking": {
    id: "fm.sla_tracking",
    name: "SLA Tracking",
    description: "Track and enforce SLA compliance",
    category: "fm",
    defaultEnabled: true,
  },
  "fm.vendor_ratings": {
    id: "fm.vendor_ratings",
    name: "Vendor Ratings",
    description: "Enable vendor rating and review system",
    category: "fm",
    defaultEnabled: true,
  },

  // Integrations
  "integrations.graphql_api": {
    id: "integrations.graphql_api",
    name: "GraphQL API",
    description: "Enable GraphQL API endpoint",
    category: "integrations",
    defaultEnabled: false,
    environmentOverrides: {
      development: true,
      staging: true,
      production: false,
    },
  },
  "integrations.opentelemetry": {
    id: "integrations.opentelemetry",
    name: "OpenTelemetry Tracing",
    description: "Enable distributed tracing with OpenTelemetry",
    category: "integrations",
    defaultEnabled: false,
    environmentOverrides: {
      development: true,
      staging: true,
      production: false,
    },
  },
  "integrations.webhook_events": {
    id: "integrations.webhook_events",
    name: "Webhook Events",
    description: "Enable webhook notifications for events",
    category: "integrations",
    defaultEnabled: false,
  },

  // Experimental
  "experimental.ai_work_order_triage": {
    id: "experimental.ai_work_order_triage",
    name: "AI Work Order Triage",
    description: "Use AI to categorize and prioritize work orders",
    category: "experimental",
    defaultEnabled: false,
    rolloutPercentage: 10,
  },
  "experimental.predictive_maintenance": {
    id: "experimental.predictive_maintenance",
    name: "Predictive Maintenance",
    description: "Use ML to predict maintenance needs",
    category: "experimental",
    defaultEnabled: false,
    rolloutPercentage: 5,
  },
};

// ============================================================================
// Runtime State
// ============================================================================

/**
 * Runtime flag overrides (can be set programmatically)
 */
const runtimeOverrides: Map<string, boolean> = new Map();

/**
 * Environment flag values (loaded from env vars)
 */
const envOverrides: Map<string, boolean> = new Map();

/**
 * Load feature flag overrides from environment variables
 * Format: FEATURE_<CATEGORY>_<NAME>=true/false
 */
function loadEnvOverrides(): void {
  if (typeof process === "undefined") return;

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("FEATURE_")) {
      // Convert FEATURE_CORE_DARK_MODE to core.dark_mode
      const flagId = key
        .replace("FEATURE_", "")
        .toLowerCase()
        .replace(/_/g, ".")
        .replace(/\./, "."); // First underscore is category separator

      const boolValue = value?.toLowerCase() === "true";
      envOverrides.set(flagId, boolValue);
    }
  }
}

// Load on module initialization
loadEnvOverrides();

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Check if a feature flag is enabled
 *
 * Evaluation order:
 * 1. Runtime overrides (programmatic)
 * 2. Environment variable overrides
 * 3. Environment-specific overrides (dev/staging/prod)
 * 4. Default value
 */
export function isFeatureEnabled(
  flagId: string,
  context?: FeatureFlagContext
): boolean {
  // Check runtime override
  if (runtimeOverrides.has(flagId)) {
    return runtimeOverrides.get(flagId)!;
  }

  // Check env override
  if (envOverrides.has(flagId)) {
    return envOverrides.get(flagId)!;
  }

  // Get flag definition
  const flag = FEATURE_FLAGS[flagId];
  if (!flag) {
    logger.warn(`[FeatureFlags] Unknown flag: ${flagId}`);
    return false;
  }

  // Check environment-specific override
  const env = context?.environment || process.env.NODE_ENV || "development";
  if (flag.environmentOverrides) {
    const envValue = flag.environmentOverrides[env as keyof typeof flag.environmentOverrides];
    if (envValue !== undefined) {
      return envValue;
    }
  }

  // Check org restrictions
  if (flag.allowedOrgs && context?.orgId) {
    if (!flag.allowedOrgs.includes(context.orgId)) {
      return false;
    }
  }

  // Check rollout percentage
  if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
    const hash = hashString(context?.userId || context?.orgId || "default");
    const bucket = hash % 100;
    if (bucket >= flag.rolloutPercentage) {
      return false;
    }
  }

  // Check dependencies
  if (flag.dependencies) {
    for (const dep of flag.dependencies) {
      if (!isFeatureEnabled(dep, context)) {
        return false;
      }
    }
  }

  return flag.defaultEnabled;
}

/**
 * Set a feature flag value at runtime
 */
export function setFeatureFlag(flagId: string, enabled: boolean): void {
  runtimeOverrides.set(flagId, enabled);
  logger.info(`[FeatureFlags] Set ${flagId} = ${enabled}`);
}

/**
 * Reset all runtime overrides
 */
export function resetFeatureFlags(): void {
  runtimeOverrides.clear();
  logger.info("[FeatureFlags] Reset all runtime overrides");
}

/**
 * Get all feature flags and their current values
 */
export function getAllFeatureFlags(
  context?: FeatureFlagContext
): Record<string, boolean> {
  const result: Record<string, boolean> = {};

  for (const flagId of Object.keys(FEATURE_FLAGS)) {
    result[flagId] = isFeatureEnabled(flagId, context);
  }

  return result;
}

/**
 * Get feature flags by category
 */
export function getFeatureFlagsByCategory(
  category: FeatureCategory,
  context?: FeatureFlagContext
): Record<string, boolean> {
  const result: Record<string, boolean> = {};

  for (const [flagId, flag] of Object.entries(FEATURE_FLAGS)) {
    if (flag.category === category) {
      result[flagId] = isFeatureEnabled(flagId, context);
    }
  }

  return result;
}

/**
 * Get feature flag definition
 */
export function getFeatureFlagDefinition(flagId: string): FeatureFlag | undefined {
  return FEATURE_FLAGS[flagId];
}

/**
 * List all available feature flags
 */
export function listFeatureFlags(): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS);
}

// ============================================================================
// Guard Functions
// ============================================================================

/**
 * Require a feature to be enabled, throw if not
 */
export function requireFeature(
  flagId: string,
  context?: FeatureFlagContext
): void {
  if (!isFeatureEnabled(flagId, context)) {
    const flag = FEATURE_FLAGS[flagId];
    throw new Error(
      `Feature not enabled: ${flag?.name || flagId}. ` +
        `Enable with FEATURE_${flagId.replace(/\./g, "_").toUpperCase()}=true`
    );
  }
}

/**
 * Create a middleware that checks for a feature flag
 */
export function createFeatureFlagMiddleware(flagId: string) {
  return async (
    _req: Request,
    context?: FeatureFlagContext
  ): Promise<Response | null> => {
    if (!isFeatureEnabled(flagId, context)) {
      return new Response(
        JSON.stringify({
          error: "Feature not available",
          code: "FEATURE_DISABLED",
          feature: flagId,
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    return null; // Continue to next handler
  };
}

// ============================================================================
// React Hook Support (for client-side)
// ============================================================================

/**
 * Get initial feature flags for client-side hydration
 */
export function getInitialFeatureFlags(): Record<string, boolean> {
  // Only include safe flags for client
  const safePrefixes = ["core.", "ui."];
  const result: Record<string, boolean> = {};

  for (const flagId of Object.keys(FEATURE_FLAGS)) {
    if (safePrefixes.some((p) => flagId.startsWith(p))) {
      result[flagId] = isFeatureEnabled(flagId);
    }
  }

  return result;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Simple string hashing for rollout bucketing
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// ============================================================================
// Exports
// ============================================================================

export default {
  isFeatureEnabled,
  setFeatureFlag,
  resetFeatureFlags,
  getAllFeatureFlags,
  getFeatureFlagsByCategory,
  getFeatureFlagDefinition,
  listFeatureFlags,
  requireFeature,
  createFeatureFlagMiddleware,
  getInitialFeatureFlags,
  FEATURE_FLAGS,
};
