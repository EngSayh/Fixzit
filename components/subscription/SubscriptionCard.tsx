/**
 * SubscriptionCard - Subscription plan display card
 * 
 * @description Displays a subscription plan with features, pricing,
 * and subscription actions.
 * 
 * @features
 * - Plan tier display
 * - Feature list with checks
 * - Monthly/yearly toggle
 * - Current plan indicator
 * - Upgrade/downgrade actions
 * - RTL-first layout
 */
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check, X, Star, Zap, Crown, type LucideIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriceDisplay } from "@/components/shared/PriceDisplay";

// ============================================================================
// TYPES
// ============================================================================

export type PlanTier = "free" | "individual" | "business" | "enterprise";
export type BillingCycle = "monthly" | "yearly";

export interface PlanFeature {
  id: string;
  name: string;
  name_ar: string;
  included: boolean;
  limit?: string;
  limit_ar?: string;
}

export interface SubscriptionPlan {
  id: string;
  tier: PlanTier;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  price_monthly: number; // in SAR
  price_yearly: number; // in SAR
  features: PlanFeature[];
  highlight?: boolean;
  badge?: string;
  badge_ar?: string;
}

export interface SubscriptionCardProps {
  /** Plan data */
  plan: SubscriptionPlan;
  /** Current billing cycle */
  billingCycle: BillingCycle;
  /** Whether this is the current user's plan */
  isCurrentPlan?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Callback when subscribe is clicked */
  onSubscribe?: (plan: SubscriptionPlan, cycle: BillingCycle) => void;
  /** Current locale */
  locale?: "ar" | "en";
  /** Custom class name */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TIER_ICONS: Record<PlanTier, LucideIcon> = {
  free: Star,
  individual: Star,
  business: Zap,
  enterprise: Crown,
};

const TIER_COLORS: Record<PlanTier, { bg: string; text: string; border: string }> = {
  free: { bg: "bg-neutral-100", text: "text-neutral-700", border: "border-neutral-200" },
  individual: { bg: "bg-primary-100", text: "text-primary-700", border: "border-primary-200" },
  business: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  enterprise: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function SubscriptionCard({
  plan,
  billingCycle,
  isCurrentPlan = false,
  isLoading = false,
  onSubscribe,
  locale = "ar",
  className,
}: SubscriptionCardProps) {
  const isRTL = locale === "ar";
  const TierIcon: LucideIcon = TIER_ICONS[plan.tier] ?? Star;
  const tierColors = TIER_COLORS[plan.tier] ?? TIER_COLORS.free;

  const price = billingCycle === "monthly" ? plan.price_monthly : plan.price_yearly;
  const monthlyEquivalent = billingCycle === "yearly" ? Math.round(plan.price_yearly / 12) : plan.price_monthly;
  const savings = billingCycle === "yearly" 
    ? Math.round(((plan.price_monthly * 12) - plan.price_yearly) / (plan.price_monthly * 12) * 100)
    : 0;

  const name = isRTL ? plan.name_ar : plan.name;
  const description = isRTL ? plan.description_ar : plan.description;
  const badge = isRTL ? plan.badge_ar : plan.badge;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border-2 bg-white p-6 transition-all",
        plan.highlight ? "border-primary-500 shadow-lg scale-105" : tierColors.border,
        isCurrentPlan && "ring-2 ring-primary-200",
        className
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Highlight badge */}
      {plan.highlight && (
        <div className="absolute -top-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">
          <Badge className="bg-primary-500 text-white px-4 py-1">
            {isRTL ? "الأكثر شعبية" : "Most Popular"}
          </Badge>
        </div>
      )}

      {/* Current plan badge */}
      {isCurrentPlan && (
        <div className="absolute -top-3 end-4">
          <Badge variant="outline" className="bg-white">
            {isRTL ? "خطتك الحالية" : "Current Plan"}
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("p-2 rounded-lg", tierColors.bg)}>
            <TierIcon className={`w-5 h-5 ${tierColors.text}`} />
          </div>
          <h3 className="text-xl font-bold text-neutral-800">{name}</h3>
          {badge && (
            <Badge variant="secondary" className={cn(tierColors.bg, tierColors.text)}>
              {badge}
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-sm text-neutral-500">{description}</p>
        )}
      </div>

      {/* Pricing */}
      <div className="mb-6">
        {plan.tier === "free" ? (
          <p className="text-3xl font-bold text-neutral-800">
            {isRTL ? "مجاني" : "Free"}
          </p>
        ) : (
          <>
            <PriceDisplay
              amount={billingCycle === "yearly" ? monthlyEquivalent : price}
              locale={locale}
              size="xl"
              period="month"
            />
            {billingCycle === "yearly" && savings > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {isRTL ? `وفر ${savings}%` : `Save ${savings}%`}
                </Badge>
                <span className="text-sm text-neutral-500">
                  {isRTL
                    ? `${price.toLocaleString("ar-SA")} ر.س/سنة`
                    : `${price.toLocaleString("en-SA")} SAR/year`}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-3 mb-6">
        {plan.features.map((feature) => {
          const featureName = isRTL ? feature.name_ar : feature.name;
          const featureLimit = isRTL ? feature.limit_ar : feature.limit;

          return (
            <li
              key={feature.id}
              className={cn(
                "flex items-start gap-2 text-sm",
                feature.included ? "text-neutral-700" : "text-neutral-400"
              )}
            >
              {feature.included ? (
                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <X className="w-5 h-5 text-neutral-300 flex-shrink-0 mt-0.5" />
              )}
              <span>
                {featureName}
                {featureLimit && (
                  <span className="text-neutral-500 ms-1">({featureLimit})</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Action */}
      <Button
        className="w-full"
        variant={plan.highlight ? "default" : "outline"}
        disabled={isCurrentPlan || isLoading}
        onClick={() => onSubscribe?.(plan, billingCycle)}
      >
        {isLoading ? (
          isRTL ? "جاري المعالجة..." : "Processing..."
        ) : isCurrentPlan ? (
          isRTL ? "خطتك الحالية" : "Current Plan"
        ) : plan.tier === "free" ? (
          isRTL ? "ابدأ مجاناً" : "Start Free"
        ) : (
          isRTL ? "اشترك الآن" : "Subscribe Now"
        )}
      </Button>
    </div>
  );
}

export default SubscriptionCard;
