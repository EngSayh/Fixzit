/**
 * WalletBalance - Wallet balance display with quick actions
 * 
 * @description Displays current wallet balance with top-up and
 * transaction history access buttons.
 * 
 * @features
 * - Balance display in SAR
 * - Low balance warning
 * - Quick top-up button
 * - Transaction history link
 * - RTL-first layout
 */
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Wallet, Plus, History, AlertTriangle } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { PriceDisplay } from "@/components/shared/PriceDisplay";

// ============================================================================
// TYPES
// ============================================================================

export interface WalletBalanceProps {
  /** Balance amount in halalas */
  balance: number;
  /** Pending amount in halalas */
  pendingAmount?: number;
  /** Low balance threshold in halalas (default: 5000 = 50 SAR) */
  lowBalanceThreshold?: number;
  /** Current locale */
  locale?: "ar" | "en";
  /** Callback when top-up is clicked */
  onTopUp?: () => void;
  /** Callback when history is clicked */
  onViewHistory?: () => void;
  /** Card variant */
  variant?: "default" | "compact" | "banner";
  /** Custom class name */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WalletBalance({
  balance,
  pendingAmount = 0,
  lowBalanceThreshold = 5000, // 50 SAR
  locale = "ar",
  onTopUp,
  onViewHistory,
  variant = "default",
  className,
}: WalletBalanceProps) {
  const isRTL = locale === "ar";
  const isLowBalance = balance < lowBalanceThreshold;
  const balanceInSAR = balance / 100;
  const pendingInSAR = pendingAmount / 100;

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg bg-white border",
          isLowBalance && "border-amber-300 bg-amber-50",
          className
        )}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className={cn(
          "p-2 rounded-full",
          isLowBalance ? "bg-amber-100" : "bg-primary-100"
        )}>
          <Wallet className={cn(
            "w-5 h-5",
            isLowBalance ? "text-amber-600" : "text-primary-600"
          )} />
        </div>
        
        <div className="flex-1">
          <p className="text-xs text-neutral-500">
            {isRTL ? "الرصيد" : "Balance"}
          </p>
          <PriceDisplay
            amount={balanceInSAR}
            locale={locale}
            size="md"
            variant={isLowBalance ? "warning" : "default"}
          />
        </div>

        {onTopUp && (
          <Button
            size="sm"
            variant={isLowBalance ? "default" : "outline"}
            onClick={onTopUp}
          >
            <Plus className="w-4 h-4 me-1" />
            {isRTL ? "شحن" : "Top Up"}
          </Button>
        )}
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl p-6",
          "bg-gradient-to-br from-primary-600 to-primary-700 text-white",
          className
        )}
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <pattern id="wallet-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="2" fill="currentColor" />
            </pattern>
            <rect fill="url(#wallet-pattern)" width="100" height="100" />
          </svg>
        </div>

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-primary-100 text-sm mb-1">
                {isRTL ? "رصيد المحفظة" : "Wallet Balance"}
              </p>
              <p className="text-3xl font-bold">
                {balanceInSAR.toLocaleString(isRTL ? "ar-SA" : "en-SA")}
                <span className="text-lg ms-1">
                  {isRTL ? "ر.س" : "SAR"}
                </span>
              </p>
            </div>
            <Wallet className="w-10 h-10 text-primary-200" />
          </div>

          {pendingAmount > 0 && (
            <p className="text-primary-200 text-sm mb-4">
              {isRTL
                ? `رصيد معلق: ${pendingInSAR.toLocaleString("ar-SA")} ر.س`
                : `Pending: ${pendingInSAR.toLocaleString("en-SA")} SAR`}
            </p>
          )}

          <div className="flex gap-3">
            {onTopUp && (
              <Button
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={onTopUp}
              >
                <Plus className="w-4 h-4 me-2" />
                {isRTL ? "شحن الرصيد" : "Top Up"}
              </Button>
            )}
            {onViewHistory && (
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10"
                onClick={onViewHistory}
              >
                <History className="w-4 h-4 me-2" />
                {isRTL ? "السجل" : "History"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default card variant
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-6",
        isLowBalance && "border-amber-200",
        className
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          "p-3 rounded-full",
          isLowBalance ? "bg-amber-100" : "bg-primary-100"
        )}>
          <Wallet className={cn(
            "w-6 h-6",
            isLowBalance ? "text-amber-600" : "text-primary-600"
          )} />
        </div>
        <div>
          <h3 className="font-semibold text-neutral-800">
            {isRTL ? "المحفظة الرقمية" : "Digital Wallet"}
          </h3>
          <p className="text-sm text-neutral-500">
            {isRTL ? "رصيدك المتاح" : "Available balance"}
          </p>
        </div>
      </div>

      {/* Balance */}
      <div className="mb-4">
        <PriceDisplay
          amount={balanceInSAR}
          locale={locale}
          size="xl"
          variant={isLowBalance ? "warning" : "default"}
        />

        {pendingAmount > 0 && (
          <p className="text-sm text-neutral-500 mt-1">
            {isRTL
              ? `+ ${pendingInSAR.toLocaleString("ar-SA")} ر.س معلق`
              : `+ ${pendingInSAR.toLocaleString("en-SA")} SAR pending`}
          </p>
        )}
      </div>

      {/* Low balance warning */}
      {isLowBalance && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 text-amber-800 mb-4">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">
            {isRTL
              ? "رصيدك منخفض. قم بالشحن لمواصلة نشر الإعلانات."
              : "Low balance. Top up to continue posting ads."}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {onTopUp && (
          <Button
            className="flex-1"
            onClick={onTopUp}
          >
            <Plus className="w-4 h-4 me-2" />
            {isRTL ? "شحن الرصيد" : "Top Up Balance"}
          </Button>
        )}
        {onViewHistory && (
          <Button
            variant="outline"
            onClick={onViewHistory}
          >
            <History className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default WalletBalance;
