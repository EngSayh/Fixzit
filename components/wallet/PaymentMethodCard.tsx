/**
 * PaymentMethodCard - Saved payment method display
 * 
 * @description Displays a saved payment card with edit/delete actions.
 * Supports Mada, Visa, Mastercard, and Apple Pay.
 * 
 * @features
 * - Card type icons
 * - Expiry date display
 * - Default card indicator
 * - Edit/delete actions
 * - RTL-first layout
 */
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Trash2, Star, MoreVertical, Check } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// TYPES
// ============================================================================

export type CardType = "mada" | "visa" | "mastercard" | "apple_pay";

export interface PaymentMethodCardProps {
  /** Unique card ID */
  id: string;
  /** Card type */
  type: CardType;
  /** Last 4 digits */
  lastFour: string;
  /** Expiry month (1-12) */
  expiryMonth: number;
  /** Expiry year (2-digit or 4-digit) */
  expiryYear: number;
  /** Card holder name */
  cardHolderName?: string;
  /** Whether this is the default card */
  isDefault?: boolean;
  /** Whether the card is expired */
  isExpired?: boolean;
  /** Callback when set as default is clicked */
  onSetDefault?: (id: string) => void;
  /** Callback when delete is clicked */
  onDelete?: (id: string) => void;
  /** Current locale */
  locale?: "ar" | "en";
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CARD_CONFIG: Record<CardType, {
  label: string;
  color: string;
  textColor: string;
  logo: string;
}> = {
  mada: {
    label: "مدى",
    color: "bg-gradient-to-r from-[#004B87] to-[#0071BC]",
    textColor: "text-white",
    logo: "mada",
  },
  visa: {
    label: "Visa",
    color: "bg-gradient-to-r from-[#1A1F71] to-[#283593]",
    textColor: "text-white",
    logo: "VISA",
  },
  mastercard: {
    label: "Mastercard",
    color: "bg-gradient-to-r from-[#EB001B] to-[#F79E1B]",
    textColor: "text-white",
    logo: "MC",
  },
  apple_pay: {
    label: "Apple Pay",
    color: "bg-gradient-to-r from-neutral-800 to-neutral-900",
    textColor: "text-white",
    logo: "",
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PaymentMethodCard({
  id,
  type,
  lastFour,
  expiryMonth,
  expiryYear,
  cardHolderName,
  isDefault = false,
  isExpired = false,
  onSetDefault,
  onDelete,
  locale = "ar",
  disabled = false,
  compact = false,
  className,
}: PaymentMethodCardProps) {
  const isRTL = locale === "ar";
  const config = CARD_CONFIG[type];

  // Format expiry year to 2 digits
  const formattedYear = expiryYear > 99 ? expiryYear % 100 : expiryYear;
  const expiryString = `${String(expiryMonth).padStart(2, "0")}/${formattedYear}`;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border",
          isExpired && "border-red-200 bg-red-50",
          isDefault && !isExpired && "border-primary-200 bg-primary-50",
          !isExpired && !isDefault && "border-neutral-200",
          className
        )}
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Card type badge */}
        <div className={cn(
          "w-12 h-8 rounded flex items-center justify-center text-xs font-bold",
          config.color,
          config.textColor
        )}>
          {config.logo}
        </div>

        {/* Card info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-800">
            •••• {lastFour}
          </p>
          <p className={cn(
            "text-xs",
            isExpired ? "text-red-600" : "text-neutral-500"
          )}>
            {isExpired
              ? (isRTL ? "منتهية" : "Expired")
              : `${isRTL ? "تنتهي" : "Expires"} ${expiryString}`}
          </p>
        </div>

        {/* Default badge */}
        {isDefault && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary-100 text-primary-700">
            <Check className="w-3 h-3" />
            {isRTL ? "الافتراضية" : "Default"}
          </span>
        )}

        {/* Actions */}
        {(onSetDefault || onDelete) && !disabled && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? "start" : "end"}>
              {onSetDefault && !isDefault && !isExpired && (
                <DropdownMenuItem onClick={() => onSetDefault(id)}>
                  <Star className="w-4 h-4 me-2" />
                  {isRTL ? "تعيين كافتراضية" : "Set as default"}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => onDelete(id)}
                >
                  <Trash2 className="w-4 h-4 me-2" />
                  {isRTL ? "حذف" : "Delete"}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  // Full card design
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-5 w-72 h-44",
        config.color,
        className
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 200 120">
          <circle cx="150" cy="60" r="80" fill="currentColor" />
          <circle cx="170" cy="60" r="60" fill="currentColor" />
        </svg>
      </div>

      <div className="relative h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-auto">
          <div>
            <p className={cn("text-lg font-bold", config.textColor)}>
              {config.logo || config.label}
            </p>
            {isDefault && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white/20 text-white mt-1">
                <Star className="w-3 h-3" />
                {isRTL ? "الافتراضية" : "Default"}
              </span>
            )}
          </div>

          {/* Actions */}
          {(onSetDefault || onDelete) && !disabled && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? "start" : "end"} className="bg-muted border-input">
                {onSetDefault && !isDefault && !isExpired && (
                  <DropdownMenuItem onClick={() => onSetDefault(id)}>
                    <Star className="w-4 h-4 me-2" />
                    {isRTL ? "تعيين كافتراضية" : "Set as default"}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => onDelete(id)}
                  >
                    <Trash2 className="w-4 h-4 me-2" />
                    {isRTL ? "حذف" : "Delete"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Card number */}
        <p className={cn("text-xl tracking-widest font-mono mb-4", config.textColor)}>
          •••• •••• •••• {lastFour}
        </p>

        {/* Footer */}
        <div className="flex items-end justify-between">
          <div>
            {cardHolderName && (
              <p className={cn("text-xs opacity-70 mb-1", config.textColor)}>
                {cardHolderName.toUpperCase()}
              </p>
            )}
            <p className={cn(
              "text-sm",
              config.textColor,
              isExpired && "line-through opacity-50"
            )}>
              {expiryString}
            </p>
          </div>

          {isExpired && (
            <span className="px-2 py-1 rounded bg-red-500 text-white text-xs font-medium">
              {isRTL ? "منتهية" : "EXPIRED"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentMethodCard;
