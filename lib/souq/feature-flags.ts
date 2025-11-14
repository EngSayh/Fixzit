/**
 * Feature Flags for Fixzit Souq Marketplace
 * Controls gradual rollout of advanced marketplace features
 * @module lib/souq/feature-flags
 */

export type SouqFeatureFlag =
  | 'ads'
  | 'deals'
  | 'buy_box'
  | 'settlement'
  | 'returns_center'
  | 'brand_registry'
  | 'account_health'
  | 'fulfillment_by_fixzit'
  | 'a_to_z_claims'
  | 'sponsored_products'
  | 'auto_repricer'
  | 'reviews_qa';

export interface SouqFeatureFlags {
  ads: boolean; // Sponsored Products/Brands/Display ads
  deals: boolean; // Lightning Deals, Event Deals, Coupons
  buy_box: boolean; // Multi-seller Buy Box competition
  settlement: boolean; // Payout cycles, fee schedules, invoicing
  returns_center: boolean; // Self-service returns with RMAs
  brand_registry: boolean; // Brand verification & IP protection
  account_health: boolean; // Seller metrics, violations, appeals
  fulfillment_by_fixzit: boolean; // FBF warehousing & shipping
  a_to_z_claims: boolean; // Buyer-seller guarantee claims
  sponsored_products: boolean; // CPC auction for search/PLP ads
  auto_repricer: boolean; // Automated competitive pricing
  reviews_qa: boolean; // Product reviews & Q&A system
}

/**
 * Default feature flags - all OFF by default in production
 * Enable via environment variables or admin console
 */
const DEFAULT_FLAGS: SouqFeatureFlags = {
  ads: false,
  deals: false,
  buy_box: false,
  settlement: false,
  returns_center: false,
  brand_registry: false,
  account_health: false,
  fulfillment_by_fixzit: false,
  a_to_z_claims: false,
  sponsored_products: false,
  auto_repricer: false,
  reviews_qa: false,
};

/**
 * Load feature flags from environment variables
 * Format: SOUQ_FEATURE_<FLAG_NAME>=true|false
 */
function loadFeatureFlagsFromEnv(): Partial<SouqFeatureFlags> {
  const flags: Partial<SouqFeatureFlags> = {};

  // Parse environment variables
  if (typeof process !== 'undefined' && process.env) {
    Object.keys(DEFAULT_FLAGS).forEach((key) => {
      const envKey = `SOUQ_FEATURE_${key.toUpperCase()}`;
      const envValue = process.env[envKey];

      if (envValue !== undefined) {
        flags[key as SouqFeatureFlag] = envValue === 'true' || envValue === '1';
      }
    });
  }

  return flags;
}

/**
 * Current feature flags (merged with environment overrides)
 */
let currentFlags: SouqFeatureFlags = {
  ...DEFAULT_FLAGS,
  ...loadFeatureFlagsFromEnv(),
};

/**
 * Check if a feature flag is enabled
 * @param flag - Feature flag name
 * @returns true if enabled, false otherwise
 */
export function isFeatureEnabled(flag: SouqFeatureFlag): boolean {
  return currentFlags[flag] ?? false;
}

/**
 * Get all current feature flags
 * @returns Object with all feature flags and their states
 */
export function getAllFeatureFlags(): Readonly<SouqFeatureFlags> {
  return { ...currentFlags };
}

/**
 * Set a feature flag (for testing or admin console)
 * WARNING: This mutates global state. Use only in tests or with proper authorization.
 * @param flag - Feature flag name
 * @param enabled - true to enable, false to disable
 */
export function setFeatureFlag(flag: SouqFeatureFlag, enabled: boolean): void {
  currentFlags = {
    ...currentFlags,
    [flag]: enabled,
  };
}

/**
 * Reset all feature flags to defaults (for testing)
 */
export function resetFeatureFlags(): void {
  currentFlags = {
    ...DEFAULT_FLAGS,
    ...loadFeatureFlagsFromEnv(),
  };
}

/**
 * Bulk set multiple feature flags
 * @param flags - Object with flags to set
 */
export function setFeatureFlags(flags: Partial<SouqFeatureFlags>): void {
  currentFlags = {
    ...currentFlags,
    ...flags,
  };
}

/**
 * Feature flag guard - throws if feature is disabled
 * Use in API routes to enforce flag checks
 * @param flag - Feature flag name
 * @throws Error if feature is disabled
 */
export function requireFeature(flag: SouqFeatureFlag): void {
  if (!isFeatureEnabled(flag)) {
    throw new Error(
      `Feature "${flag}" is not enabled. Contact your administrator to enable this feature.`
    );
  }
}

/**
 * Feature dependencies - some features require others to be enabled
 */
export const FEATURE_DEPENDENCIES: Record<SouqFeatureFlag, SouqFeatureFlag[]> = {
  ads: [], // No dependencies
  deals: [], // No dependencies
  buy_box: [], // No dependencies
  settlement: [], // No dependencies
  returns_center: [], // No dependencies
  brand_registry: [], // No dependencies
  account_health: [], // No dependencies
  fulfillment_by_fixzit: [], // No dependencies
  a_to_z_claims: ['returns_center'], // Claims require returns
  sponsored_products: ['ads'], // Sponsored products is a subset of ads
  auto_repricer: ['buy_box'], // Repricer only useful with Buy Box
  reviews_qa: [], // No dependencies
};

/**
 * Check if all dependencies for a feature are enabled
 * @param flag - Feature flag name
 * @returns true if all dependencies are enabled, false otherwise
 */
export function areDependenciesEnabled(flag: SouqFeatureFlag): boolean {
  const dependencies = FEATURE_DEPENDENCIES[flag] || [];
  return dependencies.every((dep) => isFeatureEnabled(dep));
}

/**
 * Get missing dependencies for a feature
 * @param flag - Feature flag name
 * @returns Array of missing dependency flag names
 */
export function getMissingDependencies(flag: SouqFeatureFlag): SouqFeatureFlag[] {
  const dependencies = FEATURE_DEPENDENCIES[flag] || [];
  return dependencies.filter((dep) => !isFeatureEnabled(dep));
}

/**
 * Feature flag middleware for Next.js API routes
 * @param flag - Feature flag to check
 * @returns Middleware function
 * @example
 * export async function GET(req: Request) {
 *   requireFeature('ads');
 *   // ... rest of handler
 * }
 */
export function createFeatureMiddleware(flag: SouqFeatureFlag) {
  return () => {
    requireFeature(flag);

    // Check dependencies
    if (!areDependenciesEnabled(flag)) {
      const missing = getMissingDependencies(flag);
      throw new Error(
        `Feature "${flag}" requires the following features to be enabled: ${missing.join(', ')}`
      );
    }
  };
}

// Development helper: Log feature flags on startup
if (process.env.NODE_ENV === 'development') {
  console.info('🎛️  Souq Feature Flags:', currentFlags);
}

export default {
  isFeatureEnabled,
  getAllFeatureFlags,
  setFeatureFlag,
  setFeatureFlags,
  resetFeatureFlags,
  requireFeature,
  areDependenciesEnabled,
  getMissingDependencies,
  createFeatureMiddleware,
};
