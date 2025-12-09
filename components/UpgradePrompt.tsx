'use client';
"use client";

import { useMemo } from "react";
import { Lock, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/TranslationContext";
import { useSubscription } from "@/hooks/useSubscription";
import type { FeatureName, PlanName } from "@/lib/subscription/featureGating";

export interface UpgradePromptProps {
  feature: FeatureName;
  requiredPlan: PlanName;
  title?: string;
  description?: string;
  className?: string;
  variant?: "inline" | "card" | "banner";
}

/**
 * Upgrade prompt component shown when user lacks access to a feature.
 * 
 * @example
 * ```tsx
 * <UpgradePrompt 
 *   feature="finance" 
 *   requiredPlan="PREMIUM" 
 *   variant="card"
 * />
 * ```
 */
export function UpgradePrompt({
  feature,
  requiredPlan,
  title,
  description,
  className = "",
  variant = "card",
}: UpgradePromptProps) {
  const { t } = useTranslation();
  
  const featureNames: Record<FeatureName, string> = useMemo(
    () => ({
      workOrders: t("features.workOrders", "Work Orders"),
      properties: t("features.properties", "Properties"),
      units: t("features.units", "Units"),
      basicReports: t("features.basicReports", "Basic Reports"),
      finance: t("features.finance", "Finance & Invoicing"),
      invoicing: t("features.invoicing", "Invoicing"),
      hrManagement: t("features.hrManagement", "HR Management"),
      technicians: t("features.technicians", "Technician Management"),
      approvals: t("features.approvals", "Approvals & Workflows"),
      auditTrail: t("features.auditTrail", "Audit Trail"),
      advancedReports: t("features.advancedReports", "Advanced Reports"),
      apiAccess: t("features.apiAccess", "API Access"),
      sso: t("features.sso", "Single Sign-On"),
      scim: t("features.scim", "SCIM Provisioning"),
      customSla: t("features.customSla", "Custom SLAs"),
      dedicatedSupport: t("features.dedicatedSupport", "Dedicated Support"),
      whiteLabeling: t("features.whiteLabeling", "White Labeling"),
      multiRegion: t("features.multiRegion", "Multi-Region"),
      complianceReports: t("features.complianceReports", "Compliance Reports"),
    }),
    [t],
  );
  
  const planNames: Record<PlanName, string> = useMemo(
    () => ({
      BASIC: t("plans.basic", "Basic"),
      STANDARD: t("plans.standard", "Standard"),
      PREMIUM: t("plans.premium", "Premium"),
      ENTERPRISE: t("plans.enterprise", "Enterprise"),
    }),
    [t],
  );
  
  const featureName = featureNames[feature] || feature;
  const planName = planNames[requiredPlan] || requiredPlan;
  
  const defaultTitle = t("upgrade.title", "Upgrade to unlock {{feature}}", { feature: featureName });
  const defaultDescription = t(
    "upgrade.description",
    "This feature requires the {{plan}} plan. Upgrade now to access {{feature}} and more.",
    { plan: planName, feature: featureName }
  );
  
  const displayTitle = title || defaultTitle;
  const displayDescription = description || defaultDescription;
  
  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <Lock className="h-4 w-4" />
        <span>{displayTitle}</span>
        <Link href="/pricing" className="text-primary hover:underline">
          {t("upgrade.upgrade", "Upgrade")}
        </Link>
      </div>
    );
  }
  
  if (variant === "banner") {
    return (
      <div className={`bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{displayTitle}</p>
              <p className="text-sm text-muted-foreground">{displayDescription}</p>
            </div>
          </div>
          <Link href="/pricing">
            <Button variant="default" size="sm" className="flex items-center gap-2">
              {t("upgrade.viewPlans", "View plans")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  // Default: card variant
  return (
    <div className={`border border-border rounded-2xl bg-card p-6 text-center space-y-4 ${className}`}>
      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{displayTitle}</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {displayDescription}
        </p>
      </div>
      
      <div className="flex items-center justify-center gap-3">
        <Link href="/pricing">
          <Button className="flex items-center gap-2">
            {t("upgrade.upgradeTo", "Upgrade to {{plan}}", { plan: planName })}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/billing/plan">
          <Button variant="ghost">
            {t("upgrade.comparePlans", "Compare plans")}
          </Button>
        </Link>
      </div>
      
      <p className="text-xs text-muted-foreground">
        {t("upgrade.guarantee", "30-day money-back guarantee")}
      </p>
    </div>
  );
}

/**
 * Higher-order component to wrap content with feature gating
 */
export function withFeatureGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: FeatureName,
  requiredPlan: PlanName
) {
  return function FeatureGatedComponent(props: P) {
    // Avoid gating flash while session/subscription is loading
    const { canAccessFeature, isLoading } = useSubscription();

    if (isLoading) {
      return null;
    }
    
    if (!canAccessFeature(feature)) {
      return <UpgradePrompt feature={feature} requiredPlan={requiredPlan} />;
    }
    
    return <WrappedComponent {...props} />;
  };
}

export default UpgradePrompt;
