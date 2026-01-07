/**
 * FeatureGate - Feature access control component
 * 
 * @description Renders children only if the user has access to a feature
 * based on their subscription plan. Shows upgrade prompt otherwise.
 * 
 * @features
 * - Feature-based access control
 * - Upgrade prompt
 * - Loading state
 * - Fallback content
 * - RTL-first layout
 */
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Lock, Zap, ArrowRight } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureGateProps {
  /** Feature ID to check access for */
  featureId: string;
  /** Whether the user has access to this feature */
  hasAccess: boolean;
  /** Minimum plan required for access */
  requiredPlan?: string;
  /** Required plan in Arabic */
  requiredPlanAr?: string;
  /** Children to render if access granted */
  children: React.ReactNode;
  /** Fallback content when access denied */
  fallback?: React.ReactNode;
  /** Callback when upgrade is clicked */
  onUpgrade?: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Current locale */
  locale?: "ar" | "en";
  /** Visual style for blocked state */
  blockedStyle?: "overlay" | "replace" | "blur";
  /** Custom class name */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FeatureGate({
  featureId: _featureId,
  hasAccess,
  requiredPlan,
  requiredPlanAr,
  children,
  fallback,
  onUpgrade,
  isLoading = false,
  locale = "ar",
  blockedStyle = "replace",
  className,
}: FeatureGateProps) {
  const isRTL = locale === "ar";
  const planName = isRTL ? requiredPlanAr : requiredPlan;

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-32 bg-neutral-100 rounded-lg" />
      </div>
    );
  }

  // Access granted
  if (hasAccess) {
    return <>{children}</>;
  }

  // Custom fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  // Overlay style
  if (blockedStyle === "overlay") {
    return (
      <div className={cn("relative", className)}>
        <div className="pointer-events-none opacity-50">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
          <UpgradePrompt
            planName={planName}
            locale={locale}
            onUpgrade={onUpgrade}
          />
        </div>
      </div>
    );
  }

  // Blur style
  if (blockedStyle === "blur") {
    return (
      <div className={cn("relative", className)}>
        <div className="blur-sm pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <UpgradePrompt
            planName={planName}
            locale={locale}
            onUpgrade={onUpgrade}
          />
        </div>
      </div>
    );
  }

  // Replace style (default)
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/50",
        className
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <UpgradePrompt
        planName={planName}
        locale={locale}
        onUpgrade={onUpgrade}
        expanded
      />
    </div>
  );
}

// ============================================================================
// UPGRADE PROMPT SUB-COMPONENT
// ============================================================================

interface UpgradePromptProps {
  planName?: string;
  locale: "ar" | "en";
  onUpgrade?: () => void;
  expanded?: boolean;
}

function UpgradePrompt({ planName, locale, onUpgrade, expanded }: UpgradePromptProps) {
  const isRTL = locale === "ar";

  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mb-4">
        <Lock className="w-6 h-6 text-amber-600" />
      </div>

      <h4 className="font-semibold text-neutral-800 mb-1">
        {isRTL ? "ميزة مميزة" : "Premium Feature"}
      </h4>

      <p className="text-sm text-neutral-500 mb-4 max-w-xs">
        {isRTL
          ? `هذه الميزة متاحة في ${planName || "الباقات المميزة"}`
          : `This feature is available in ${planName || "premium plans"}`}
      </p>

      {expanded && (
        <div className="flex items-center justify-center gap-3 text-sm text-neutral-400 mb-4">
          <Zap className="w-4 h-4" />
          <span>
            {isRTL
              ? "قم بالترقية للوصول الكامل"
              : "Upgrade for full access"}
          </span>
        </div>
      )}

      {onUpgrade && (
        <Button onClick={onUpgrade} className="gap-2">
          {isRTL ? "ترقية الآن" : "Upgrade Now"}
          <ArrowRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// HOOK FOR FEATURE ACCESS
// ============================================================================

export interface UseFeatureAccessOptions {
  userPlan?: string;
  featureRequirements: Record<string, string[]>; // feature -> allowed plans
}

export function useFeatureAccess({ userPlan, featureRequirements }: UseFeatureAccessOptions) {
  const checkAccess = React.useCallback(
    (featureId: string): boolean => {
      if (!userPlan) return false;
      const allowedPlans = featureRequirements[featureId];
      if (!allowedPlans) return true; // No restriction
      return allowedPlans.includes(userPlan);
    },
    [userPlan, featureRequirements]
  );

  return { checkAccess, userPlan };
}

export default FeatureGate;
