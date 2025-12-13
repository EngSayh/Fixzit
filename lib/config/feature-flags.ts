import type {
  FeatureFlag,
  FeatureFlagContext,
  FeatureCategory,
} from "@/lib/feature-flags";
import {
  FEATURE_FLAGS,
  createFeatureFlagMiddleware,
  getAllFeatureFlags,
  getFeatureFlagDefinition,
  getFeatureFlagsByCategory as getFeatureFlagsByCategoryCanonical,
  getInitialFeatureFlags,
  isFeatureEnabled,
  listFeatureFlags,
  requireFeature,
  resetFeatureFlags,
  setFeatureFlag,
} from "@/lib/feature-flags";

export type FeatureFlags = Record<keyof typeof FEATURE_FLAGS, boolean>;

export {
  FEATURE_FLAGS,
  FeatureFlag,
  FeatureFlagContext,
  FeatureCategory,
  isFeatureEnabled,
  createFeatureFlagMiddleware,
  listFeatureFlags,
  getFeatureFlagDefinition,
  setFeatureFlag,
  resetFeatureFlags,
  requireFeature,
  getInitialFeatureFlags,
};

export function getFeatureFlags(): FeatureFlags {
  return getAllFeatureFlags() as FeatureFlags;
}

export function getFeatureFlagsByCategory(
  category: FeatureCategory,
  context?: FeatureFlagContext,
): Record<string, boolean> {
  return getFeatureFlagsByCategoryCanonical(category, context);
}

export const featureFlags = {
  get flags() {
    return getFeatureFlags();
  },
  isEnabled: isFeatureEnabled,
  getByCategory: getFeatureFlagsByCategory,
  definitions: FEATURE_FLAGS,
};

export default featureFlags;
