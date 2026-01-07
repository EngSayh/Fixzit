/**
 * PlanComparison - Side-by-side plan comparison table
 * 
 * @description Displays all subscription plans in a comparison table
 * format with feature matrix.
 * 
 * @features
 * - Horizontal scrollable on mobile
 * - Feature grouping
 * - Plan highlighting
 * - Billing cycle toggle
 * - RTL-first layout
 */
"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, X, Minus } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TogglePills } from "@/components/shared/TogglePills";
import { PriceDisplay } from "@/components/shared/PriceDisplay";

// ============================================================================
// TYPES
// ============================================================================

export type FeatureValue = boolean | string | number;

export interface ComparisonFeature {
  id: string;
  name: string;
  name_ar: string;
  category?: string;
  category_ar?: string;
  tooltip?: string;
  tooltip_ar?: string;
  values: Record<string, FeatureValue>;
}

export interface ComparisonPlan {
  id: string;
  name: string;
  name_ar: string;
  price_monthly: number;
  price_yearly: number;
  highlight?: boolean;
  badge?: string;
  badge_ar?: string;
}

export interface PlanComparisonProps {
  /** Plans to compare */
  plans: ComparisonPlan[];
  /** Features to compare */
  features: ComparisonFeature[];
  /** Current user's plan ID */
  currentPlanId?: string;
  /** Loading state for plan ID */
  loadingPlanId?: string;
  /** Callback when subscribe is clicked */
  onSubscribe?: (planId: string, cycle: "monthly" | "yearly") => void;
  /** Current locale */
  locale?: "ar" | "en";
  /** Custom class name */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PlanComparison({
  plans,
  features,
  currentPlanId,
  loadingPlanId,
  onSubscribe,
  locale = "ar",
  className,
}: PlanComparisonProps) {
  const isRTL = locale === "ar";
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  // Group features by category
  const groupedFeatures = features.reduce((acc, feature) => {
    const category = isRTL ? (feature.category_ar || "عام") : (feature.category || "General");
    if (!acc[category]) acc[category] = [];
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, ComparisonFeature[]>);

  const renderValue = (value: FeatureValue) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className="w-5 h-5 text-green-500 mx-auto" />
      ) : (
        <X className="w-5 h-5 text-neutral-300 mx-auto" />
      );
    }
    if (value === null || value === undefined || value === "") {
      return <Minus className="w-5 h-5 text-neutral-300 mx-auto" />;
    }
    return <span className="text-sm font-medium text-neutral-700">{value}</span>;
  };

  const billingOptions = [
    { value: "monthly" as const, label: "Monthly", label_ar: "شهري" },
    { value: "yearly" as const, label: "Yearly", label_ar: "سنوي" },
  ];

  const handleBillingChange = (value: string | null) => {
    if (value === "monthly" || value === "yearly") {
      setBillingCycle(value);
    }
  };

  return (
    <div className={cn("", className)} dir={isRTL ? "rtl" : "ltr"}>
      {/* Billing toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-3 p-1 bg-neutral-100 rounded-full">
          <TogglePills
            options={billingOptions}
            value={billingCycle}
            onChange={handleBillingChange}
            locale={locale}
            size="md"
          />
          {billingCycle === "yearly" && (
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {isRTL ? "وفر حتى 17%" : "Save up to 17%"}
            </Badge>
          )}
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          {/* Header */}
          <thead>
            <tr>
              <th className="text-start p-4 bg-neutral-50 rounded-ts-lg">
                <span className="text-sm font-medium text-neutral-600">
                  {isRTL ? "المميزات" : "Features"}
                </span>
              </th>
              {plans.map((plan, index) => {
                const name = isRTL ? plan.name_ar : plan.name;
                const badge = isRTL ? plan.badge_ar : plan.badge;
                const price = billingCycle === "monthly" ? plan.price_monthly : plan.price_yearly;
                const isLast = index === plans.length - 1;

                return (
                  <th
                    key={plan.id}
                    className={cn(
                      "p-4 text-center bg-neutral-50",
                      plan.highlight && "bg-primary-50",
                      isLast && "rounded-te-lg"
                    )}
                  >
                    <div className="space-y-2">
                      {badge && (
                        <Badge
                          className={cn(
                            "mb-1",
                            plan.highlight
                              ? "bg-primary-500 text-white"
                              : "bg-neutral-200 text-neutral-600"
                          )}
                        >
                          {badge}
                        </Badge>
                      )}
                      <p className="text-lg font-bold text-neutral-800">{name}</p>
                      <div>
                        {price === 0 ? (
                          <p className="text-2xl font-bold text-neutral-800">
                            {isRTL ? "مجاني" : "Free"}
                          </p>
                        ) : (
                          <PriceDisplay
                            amount={billingCycle === "yearly" ? Math.round(price / 12) : price}
                            locale={locale}
                            size="lg"
                            period="month"
                          />
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
              <React.Fragment key={category}>
                {/* Category header */}
                <tr>
                  <td
                    colSpan={plans.length + 1}
                    className="p-3 bg-neutral-100 font-semibold text-sm text-neutral-700"
                  >
                    {category}
                  </td>
                </tr>

                {/* Features */}
                {categoryFeatures.map((feature) => {
                  const name = isRTL ? feature.name_ar : feature.name;

                  return (
                    <tr key={feature.id} className="border-b border-neutral-100">
                      <td className="p-4 text-sm text-neutral-700">
                        {name}
                        {feature.tooltip && (
                          <span className="text-neutral-400 ms-1" title={isRTL ? feature.tooltip_ar : feature.tooltip}>
                            ⓘ
                          </span>
                        )}
                      </td>
                      {plans.map((plan) => (
                        <td
                          key={plan.id}
                          className={cn(
                            "p-4 text-center",
                            plan.highlight && "bg-primary-50/50"
                          )}
                        >
                          {renderValue(feature.values[plan.id])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}

            {/* Action row */}
            <tr>
              <td className="p-4 bg-neutral-50 rounded-bs-lg" />
              {plans.map((plan, index) => {
                const isCurrentPlan = plan.id === currentPlanId;
                const isLoading = plan.id === loadingPlanId;
                const isLast = index === plans.length - 1;

                return (
                  <td
                    key={plan.id}
                    className={cn(
                      "p-4 text-center bg-neutral-50",
                      plan.highlight && "bg-primary-50",
                      isLast && "rounded-be-lg"
                    )}
                  >
                    <Button
                      className="w-full"
                      variant={plan.highlight ? "default" : "outline"}
                      disabled={isCurrentPlan || isLoading}
                      onClick={() => onSubscribe?.(plan.id, billingCycle)}
                    >
                      {isLoading
                        ? (isRTL ? "جاري المعالجة..." : "Processing...")
                        : isCurrentPlan
                        ? (isRTL ? "خطتك الحالية" : "Current Plan")
                        : (isRTL ? "اختر الخطة" : "Choose Plan")}
                    </Button>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PlanComparison;
