/**
 * PriceDisplay - Formatted price display with currency
 * 
 * @description Displays prices in SAR with proper Arabic/English formatting,
 * supporting halalas, discounts, and various size variants.
 * 
 * @features
 * - SAR currency formatting
 * - Halalas support
 * - Discount display (original/sale price)
 * - Period labels (per month, per year)
 * - RTL-first layout
 * - Size variants
 */
"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface PriceDisplayProps {
  /** Price amount in SAR (or halalas if useHalalas=true) */
  amount: number;
  /** Whether amount is in halalas (will be converted to SAR) */
  useHalalas?: boolean;
  /** Original price (for discount display) */
  originalAmount?: number;
  /** Currency code */
  currency?: "SAR" | "USD" | "EUR";
  /** Show currency symbol/label */
  showCurrency?: boolean;
  /** Period label */
  period?: "month" | "year" | "day" | "once" | null;
  /** Current locale */
  locale?: "ar" | "en";
  /** Size variant */
  size?: "sm" | "md" | "lg" | "xl";
  /** Color variant */
  variant?: "default" | "success" | "warning" | "muted";
  /** Whether to show decimals */
  showDecimals?: boolean;
  /** Custom class name */
  className?: string;
  /** Price class name */
  priceClassName?: string;
  /** Currency class name */
  currencyClassName?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CURRENCY_LABELS = {
  SAR: { ar: "ر.س", en: "SAR" },
  USD: { ar: "دولار", en: "USD" },
  EUR: { ar: "يورو", en: "EUR" },
} as const;

const PERIOD_LABELS = {
  month: { ar: "/شهر", en: "/mo" },
  year: { ar: "/سنة", en: "/yr" },
  day: { ar: "/يوم", en: "/day" },
  once: { ar: "", en: "" },
} as const;

// ============================================================================
// HELPERS
// ============================================================================

const formatNumber = (num: number, locale: "ar" | "en", showDecimals: boolean): string => {
  if (showDecimals) {
    return num.toLocaleString(locale === "ar" ? "ar-SA" : "en-SA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return Math.round(num).toLocaleString(locale === "ar" ? "ar-SA" : "en-SA");
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PriceDisplay({
  amount,
  useHalalas = false,
  originalAmount,
  currency = "SAR",
  showCurrency = true,
  period = null,
  locale = "ar",
  size = "md",
  variant = "default",
  showDecimals = false,
  className,
  priceClassName,
  currencyClassName,
}: PriceDisplayProps) {
  const isRTL = locale === "ar";
  
  // Convert halalas to SAR if needed
  const priceInSAR = useHalalas ? amount / 100 : amount;
  const originalInSAR = originalAmount ? (useHalalas ? originalAmount / 100 : originalAmount) : null;
  
  const hasDiscount = originalInSAR !== null && originalInSAR > priceInSAR;
  const discountPercent = hasDiscount
    ? Math.round(((originalInSAR - priceInSAR) / originalInSAR) * 100)
    : 0;

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-3xl",
  };

  const currencySizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-xl",
  };

  const originalSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
  };

  const variantClasses = {
    default: "text-neutral-900",
    success: "text-green-600",
    warning: "text-amber-600",
    muted: "text-neutral-500",
  };

  const currencyLabel = CURRENCY_LABELS[currency][locale];
  const periodLabel = period ? PERIOD_LABELS[period][locale] : "";

  return (
    <div
      className={cn("inline-flex items-baseline gap-1 flex-wrap", className)}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Main price */}
      <span
        className={cn(
          "font-bold",
          sizeClasses[size],
          variantClasses[variant],
          priceClassName
        )}
      >
        {formatNumber(priceInSAR, locale, showDecimals)}
      </span>

      {/* Currency */}
      {showCurrency && (
        <span
          className={cn(
            "font-medium text-neutral-500",
            currencySizeClasses[size],
            currencyClassName
          )}
        >
          {currencyLabel}
        </span>
      )}

      {/* Period */}
      {periodLabel && (
        <span className={cn("text-neutral-400", currencySizeClasses[size])}>
          {periodLabel}
        </span>
      )}

      {/* Original price (for discounts) */}
      {hasDiscount && (
        <span
          className={cn(
            "line-through text-neutral-400",
            originalSizeClasses[size]
          )}
        >
          {formatNumber(originalInSAR, locale, showDecimals)}
        </span>
      )}

      {/* Discount badge */}
      {hasDiscount && discountPercent > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          {isRTL ? `${discountPercent}%-` : `-${discountPercent}%`}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// CONVENIENCE VARIANTS
// ============================================================================

export function PriceTag(props: Omit<PriceDisplayProps, "size">) {
  return <PriceDisplay {...props} size="lg" />;
}

export function PriceCompact(props: Omit<PriceDisplayProps, "size">) {
  return <PriceDisplay {...props} size="sm" showCurrency={false} />;
}

export default PriceDisplay;
