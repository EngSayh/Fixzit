"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";
import {
  hasFeatureAccess,
  hasModuleAccess,
  getAvailableFeatures,
  getAvailableModules,
  getPlanLimits,
  isWithinLimit,
  normalizePlanName,
  isSubscriptionActive,
  daysUntilExpiry,
  FEATURE_REQUIREMENTS,
  type FeatureName,
  type ModuleName,
  type PlanName,
} from "@/lib/subscription/featureGating";

export interface SubscriptionState {
  // Status
  isLoading: boolean;
  isActive: boolean;
  plan: PlanName;
  daysRemaining: number | null;
  subscriptionStatus?: string | null;
  
  // Access checks
  canAccessFeature: (feature: FeatureName) => boolean;
  canAccessModule: (module: ModuleName) => boolean;
  isWithinLimit: (limitType: "maxUsers" | "maxProperties" | "maxWorkOrdersPerMonth" | "maxStorageGB", current: number) => boolean;
  
  // Available resources
  availableFeatures: FeatureName[];
  availableModules: ModuleName[];
  limits: ReturnType<typeof getPlanLimits>;
  
  // Upgrade helpers
  needsUpgrade: (feature: FeatureName) => boolean;
  getUpgradePlan: (feature: FeatureName) => PlanName;
}

/**
 * React hook for subscription-based feature gating.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { canAccessFeature, needsUpgrade, plan } = useSubscription();
 *   
 *   if (!canAccessFeature('finance')) {
 *     return <UpgradePrompt feature="finance" />;
 *   }
 *   
 *   return <FinanceModule />;
 * }
 * ```
 */
export function useSubscription(): SubscriptionState {
  const { data: session, status } = useSession();
  
  const subscriptionData = useMemo(() => {
    const isLoading = status === "loading";
    
    // Extract subscription info from session
    const user = session?.user as {
      subscriptionPlan?: string;
      subscriptionStatus?: string;
      subscriptionActiveUntil?: string;
    } | undefined;
    
    const rawPlan = user?.subscriptionPlan;
    const subscriptionStatus = user?.subscriptionStatus;
    const activeUntil = user?.subscriptionActiveUntil;
    
    // Normalize and validate
    const plan = normalizePlanName(rawPlan);
    const isActive = isSubscriptionActive(subscriptionStatus || "ACTIVE", activeUntil);
    const daysRemaining = daysUntilExpiry(activeUntil);
    
    // Get available resources
    const availableFeatures = getAvailableFeatures(plan);
    const availableModules = getAvailableModules(plan);
    const limits = getPlanLimits(plan);
    
    return {
      isLoading,
      isActive,
      plan,
      daysRemaining,
      subscriptionStatus: subscriptionStatus ?? null,
      availableFeatures,
      availableModules,
      limits,
    };
  }, [session, status]);
  
  const canAccessFeature = useMemo(() => {
    return (feature: FeatureName) => {
      // If subscription is not active, only allow basic features
      if (!subscriptionData.isActive) {
        return hasFeatureAccess("BASIC", feature);
      }
      return hasFeatureAccess(subscriptionData.plan, feature);
    };
  }, [subscriptionData.isActive, subscriptionData.plan]);
  
  const canAccessModule = useMemo(() => {
    return (module: ModuleName) => {
      if (!subscriptionData.isActive) {
        return hasModuleAccess("BASIC", module);
      }
      return hasModuleAccess(subscriptionData.plan, module);
    };
  }, [subscriptionData.isActive, subscriptionData.plan]);
  
  const checkLimit = useMemo(() => {
    return (limitType: "maxUsers" | "maxProperties" | "maxWorkOrdersPerMonth" | "maxStorageGB", current: number) => {
      return isWithinLimit(subscriptionData.plan, limitType, current);
    };
  }, [subscriptionData.plan]);
  
  const needsUpgrade = useMemo(() => {
    return (feature: FeatureName) => !canAccessFeature(feature);
  }, [canAccessFeature]);
  
  const getUpgradePlan = useMemo(() => {
    return (feature: FeatureName): PlanName => {
      return FEATURE_REQUIREMENTS[feature] as PlanName;
    };
  }, []);
  
  return {
    ...subscriptionData,
    canAccessFeature,
    canAccessModule,
    isWithinLimit: checkLimit,
    needsUpgrade,
    getUpgradePlan,
  };
}

export default useSubscription;
