/**
 * Subscription Feature Gating Utilities
 * 
 * Provides plan-based feature access control for both server-side and client-side.
 * Used by navigation components, API routes, and UI elements to enforce subscription limits.
 */

// Plan hierarchy
export const PLAN_LEVELS = {
  BASIC: 1,
  STANDARD: 1,
  PREMIUM: 2,
  ENTERPRISE: 3,
} as const;

export type PlanName = keyof typeof PLAN_LEVELS;

// Feature definitions with minimum required plan
export const FEATURE_REQUIREMENTS = {
  // Core features (all plans)
  workOrders: "BASIC",
  properties: "BASIC",
  units: "BASIC",
  basicReports: "BASIC",
  
  // Premium features
  finance: "PREMIUM",
  invoicing: "PREMIUM",
  hrManagement: "PREMIUM",
  technicians: "PREMIUM",
  approvals: "PREMIUM",
  auditTrail: "PREMIUM",
  advancedReports: "PREMIUM",
  apiAccess: "PREMIUM",
  
  // Enterprise features
  sso: "ENTERPRISE",
  scim: "ENTERPRISE",
  customSla: "ENTERPRISE",
  dedicatedSupport: "ENTERPRISE",
  whiteLabeling: "ENTERPRISE",
  multiRegion: "ENTERPRISE",
  complianceReports: "ENTERPRISE",
} as const;

export type FeatureName = keyof typeof FEATURE_REQUIREMENTS;

// Module definitions with required features
export const MODULE_REQUIREMENTS = {
  fm: "BASIC",
  workOrders: "BASIC",
  properties: "BASIC",
  finance: "PREMIUM",
  hr: "PREMIUM",
  compliance: "PREMIUM",
  reports: "BASIC",
  advancedReports: "PREMIUM",
  integrations: "PREMIUM",
  aqar: "BASIC",
  souq: "BASIC",
  crm: "PREMIUM",
  admin: "BASIC", // All plans can access admin (but features within may be gated)
} as const;

export type ModuleName = keyof typeof MODULE_REQUIREMENTS;

// Plan limits
export const PLAN_LIMITS = {
  BASIC: {
    maxUsers: 5,
    maxProperties: 10,
    maxWorkOrdersPerMonth: 100,
    maxStorageGB: 1,
    supportLevel: "email",
  },
  STANDARD: {
    maxUsers: 5,
    maxProperties: 10,
    maxWorkOrdersPerMonth: 100,
    maxStorageGB: 1,
    supportLevel: "email",
  },
  PREMIUM: {
    maxUsers: 25,
    maxProperties: 50,
    maxWorkOrdersPerMonth: 1000,
    maxStorageGB: 10,
    supportLevel: "priority",
  },
  ENTERPRISE: {
    maxUsers: -1, // Unlimited
    maxProperties: -1,
    maxWorkOrdersPerMonth: -1,
    maxStorageGB: 100,
    supportLevel: "dedicated",
  },
} as const;

/**
 * Check if a plan has access to a specific feature
 */
export function hasFeatureAccess(
  userPlan: string | undefined | null,
  feature: FeatureName
): boolean {
  const plan = normalizePlanName(userPlan);
  const requiredPlan = FEATURE_REQUIREMENTS[feature] as PlanName;
  
  const userLevel = PLAN_LEVELS[plan] || 0;
  const requiredLevel = PLAN_LEVELS[requiredPlan] || 999;
  
  return userLevel >= requiredLevel;
}

/**
 * Check if a plan has access to a specific module
 */
export function hasModuleAccess(
  userPlan: string | undefined | null,
  module: ModuleName
): boolean {
  const plan = normalizePlanName(userPlan);
  const requiredPlan = MODULE_REQUIREMENTS[module] as PlanName;
  
  const userLevel = PLAN_LEVELS[plan] || 0;
  const requiredLevel = PLAN_LEVELS[requiredPlan] || 999;
  
  return userLevel >= requiredLevel;
}

/**
 * Get all features available for a plan
 */
export function getAvailableFeatures(userPlan: string | undefined | null): FeatureName[] {
  const plan = normalizePlanName(userPlan);
  const userLevel = PLAN_LEVELS[plan] || 0;
  
  return (Object.entries(FEATURE_REQUIREMENTS) as [FeatureName, string][])
    .filter(([, requiredPlan]) => {
      const requiredLevel = PLAN_LEVELS[requiredPlan as PlanName] || 999;
      return userLevel >= requiredLevel;
    })
    .map(([feature]) => feature);
}

/**
 * Get all modules available for a plan
 */
export function getAvailableModules(userPlan: string | undefined | null): ModuleName[] {
  const plan = normalizePlanName(userPlan);
  const userLevel = PLAN_LEVELS[plan] || 0;
  
  return (Object.entries(MODULE_REQUIREMENTS) as [ModuleName, string][])
    .filter(([, requiredPlan]) => {
      const requiredLevel = PLAN_LEVELS[requiredPlan as PlanName] || 999;
      return userLevel >= requiredLevel;
    })
    .map(([module]) => module);
}

/**
 * Get plan limits
 */
export function getPlanLimits(userPlan: string | undefined | null): typeof PLAN_LIMITS.BASIC {
  const plan = normalizePlanName(userPlan);
  return PLAN_LIMITS[plan] || PLAN_LIMITS.BASIC;
}

/**
 * Check if user is within a specific limit
 */
export function isWithinLimit(
  userPlan: string | undefined | null,
  limitType: keyof typeof PLAN_LIMITS.BASIC,
  currentValue: number
): boolean {
  const limits = getPlanLimits(userPlan);
  const limit = limits[limitType];
  
  // -1 means unlimited
  if (typeof limit === "number" && limit === -1) return true;
  if (typeof limit === "number") return currentValue < limit;
  
  return true;
}

/**
 * Get the minimum plan required for a feature
 */
export function getRequiredPlan(feature: FeatureName): PlanName {
  return FEATURE_REQUIREMENTS[feature] as PlanName;
}

/**
 * Get upgrade suggestion for a feature
 */
export function getUpgradeSuggestion(
  userPlan: string | undefined | null,
  feature: FeatureName
): { canAccess: boolean; suggestedPlan?: PlanName; message: string } {
  if (hasFeatureAccess(userPlan, feature)) {
    return { canAccess: true, message: "Feature available" };
  }
  
  const requiredPlan = getRequiredPlan(feature);
  return {
    canAccess: false,
    suggestedPlan: requiredPlan,
    message: `Upgrade to ${requiredPlan} to access this feature`,
  };
}

/**
 * Normalize plan name to standard format
 */
export function normalizePlanName(plan: string | undefined | null): PlanName {
  if (!plan) return "BASIC";
  
  const normalized = plan.toUpperCase().trim();
  
  // Map aliases
  const aliases: Record<string, PlanName> = {
    FREE: "BASIC",
    TRIAL: "BASIC",
    STARTER: "BASIC",
    PRO: "PREMIUM",
    PROFESSIONAL: "PREMIUM",
    BUSINESS: "PREMIUM",
    CORPORATE: "ENTERPRISE",
  };
  
  if (aliases[normalized]) {
    return aliases[normalized];
  }
  
  if (normalized in PLAN_LEVELS) {
    return normalized as PlanName;
  }
  
  return "BASIC";
}

/**
 * Check if a subscription is active (not expired)
 */
export function isSubscriptionActive(
  status: string | undefined | null,
  activeUntil: Date | string | undefined | null
): boolean {
  // Check status
  const activeStatuses = ["ACTIVE", "TRIAL"];
  const normalizedStatus = status?.toUpperCase() || "";
  
  if (!activeStatuses.includes(normalizedStatus)) {
    return false;
  }
  
  // Check expiry date
  if (activeUntil) {
    const expiryDate = typeof activeUntil === "string" ? new Date(activeUntil) : activeUntil;
    if (expiryDate < new Date()) {
      return false;
    }
  }
  
  return true;
}

/**
 * Calculate days until subscription expires
 */
export function daysUntilExpiry(activeUntil: Date | string | undefined | null): number | null {
  if (!activeUntil) return null;
  
  const expiryDate = typeof activeUntil === "string" ? new Date(activeUntil) : activeUntil;
  const now = new Date();
  const diff = expiryDate.getTime() - now.getTime();
  
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
