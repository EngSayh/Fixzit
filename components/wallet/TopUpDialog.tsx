/**
 * TopUpDialog - Wallet balance top-up modal
 * 
 * @description Handles wallet balance top-up with multiple payment methods
 * including Mada, Visa, Mastercard, and Apple Pay.
 * 
 * @features
 * - Amount selection with presets
 * - Payment method selection
 * - Saved cards display
 * - Real-time validation
 * - Loading states
 * - RTL-first layout
 */
"use client";

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Smartphone, Check, Loader2 } from "@/components/ui/icons";
import { PriceDisplay } from "@/components/shared/PriceDisplay";

// ============================================================================
// TYPES
// ============================================================================

export type PaymentMethodType = "mada" | "visa" | "mastercard" | "apple_pay" | "new_card";

export interface SavedCard {
  id: string;
  type: "mada" | "visa" | "mastercard";
  last_four: string;
  expiry_month: number;
  expiry_year: number;
  card_holder_name?: string;
  is_default?: boolean;
}

export interface TopUpDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when dialog closes */
  onClose: () => void;
  /** Callback when top-up is submitted */
  onSubmit: (amount: number, paymentMethod: PaymentMethodType, cardId?: string) => Promise<void>;
  /** Current wallet balance in halalas */
  currentBalance?: number;
  /** Saved payment cards */
  savedCards?: SavedCard[];
  /** Minimum top-up amount in SAR */
  minAmount?: number;
  /** Maximum top-up amount in SAR */
  maxAmount?: number;
  /** Current locale */
  locale?: "ar" | "en";
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRESET_AMOUNTS = [50, 100, 200, 500, 1000];

const PAYMENT_METHODS = {
  mada: { label: "مدى", labelEn: "Mada", color: "bg-[#004B87]" },
  visa: { label: "فيزا", labelEn: "Visa", color: "bg-[#1A1F71]" },
  mastercard: { label: "ماستركارد", labelEn: "Mastercard", color: "bg-[#EB001B]" },
  apple_pay: { label: "Apple Pay", labelEn: "Apple Pay", color: "bg-black" },
} as const;

// ============================================================================
// COMPONENT
// ============================================================================

export function TopUpDialog({
  open,
  onClose,
  onSubmit,
  currentBalance = 0,
  savedCards = [],
  minAmount = 10,
  maxAmount = 50000,
  locale = "ar",
}: TopUpDialogProps) {
  const isRTL = locale === "ar";
  
  const [amount, setAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAmountPreset = (preset: number) => {
    setAmount(preset);
    setCustomAmount("");
    setError(null);
  };

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= minAmount && numValue <= maxAmount) {
      setAmount(numValue);
      setError(null);
    }
  };

  const handleMethodSelect = (method: PaymentMethodType, cardId?: string) => {
    setSelectedMethod(method);
    setSelectedCardId(cardId || null);
    setError(null);
  };

  const validateAndSubmit = useCallback(async () => {
    // Validate amount
    if (amount < minAmount) {
      setError(isRTL
        ? `الحد الأدنى للشحن ${minAmount} ر.س`
        : `Minimum top-up is ${minAmount} SAR`);
      return;
    }
    if (amount > maxAmount) {
      setError(isRTL
        ? `الحد الأقصى للشحن ${maxAmount} ر.س`
        : `Maximum top-up is ${maxAmount} SAR`);
      return;
    }

    // Validate payment method
    if (!selectedMethod) {
      setError(isRTL ? "اختر طريقة الدفع" : "Select a payment method");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(amount, selectedMethod, selectedCardId || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : (isRTL ? "فشل الشحن" : "Top-up failed"));
    } finally {
      setIsSubmitting(false);
    }
  }, [amount, minAmount, maxAmount, selectedMethod, selectedCardId, onSubmit, onClose, isRTL]);

  const currentBalanceInSAR = currentBalance / 100;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>
            {isRTL ? "شحن الرصيد" : "Top Up Balance"}
          </DialogTitle>
          <DialogDescription>
            {isRTL
              ? `رصيدك الحالي: ${currentBalanceInSAR.toLocaleString("ar-SA")} ر.س`
              : `Current balance: ${currentBalanceInSAR.toLocaleString("en-SA")} SAR`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Amount Selection */}
          <div>
            <Label className="mb-3 block">
              {isRTL ? "اختر المبلغ" : "Select Amount"}
            </Label>
            
            {/* Preset amounts */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAmountPreset(preset)}
                  className={cn(
                    "py-2 px-3 rounded-lg border text-sm font-medium transition-colors",
                    amount === preset && !customAmount
                      ? "bg-primary-500 text-white border-primary-500"
                      : "bg-white text-neutral-700 border-neutral-200 hover:border-primary-300"
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="relative">
              <Input
                type="number"
                placeholder={isRTL ? "مبلغ آخر" : "Other amount"}
                value={customAmount}
                onChange={(e) => handleCustomAmount(e.target.value)}
                min={minAmount}
                max={maxAmount}
                className="pe-12"
              />
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
                {isRTL ? "ر.س" : "SAR"}
              </span>
            </div>

            {/* Selected amount display */}
            <div className="mt-3 p-3 rounded-lg bg-neutral-50 text-center">
              <p className="text-sm text-neutral-500 mb-1">
                {isRTL ? "سيتم شحن" : "You will top up"}
              </p>
              <PriceDisplay amount={amount} locale={locale} size="lg" />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <Label className="mb-3 block">
              {isRTL ? "طريقة الدفع" : "Payment Method"}
            </Label>

            {/* Saved cards */}
            {savedCards.length > 0 && (
              <div className="space-y-2 mb-3">
                <p className="text-xs text-neutral-500">
                  {isRTL ? "البطاقات المحفوظة" : "Saved cards"}
                </p>
                {savedCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleMethodSelect(card.type, card.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      selectedCardId === card.id
                        ? "border-primary-500 bg-primary-50"
                        : "border-neutral-200 hover:border-neutral-300"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-6 rounded flex items-center justify-center text-white text-xs font-bold",
                      PAYMENT_METHODS[card.type].color
                    )}>
                      {card.type === "mada" ? "mada" : card.type.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-start">
                      <p className="text-sm font-medium">
                        •••• {card.last_four}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {card.expiry_month}/{card.expiry_year}
                      </p>
                    </div>
                    {selectedCardId === card.id && (
                      <Check className="w-5 h-5 text-primary-500" />
                    )}
                    {card.is_default && (
                      <span className="text-xs bg-neutral-100 px-2 py-0.5 rounded">
                        {isRTL ? "افتراضي" : "Default"}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* New payment methods */}
            <div className="grid grid-cols-2 gap-2">
              {/* Mada */}
              <button
                type="button"
                onClick={() => handleMethodSelect("mada")}
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors",
                  selectedMethod === "mada" && !selectedCardId
                    ? "border-primary-500 bg-primary-50"
                    : "border-neutral-200 hover:border-neutral-300"
                )}
              >
                <div className="w-10 h-6 rounded bg-[#004B87] flex items-center justify-center text-white text-xs font-bold">
                  mada
                </div>
              </button>

              {/* Visa/MC */}
              <button
                type="button"
                onClick={() => handleMethodSelect("new_card")}
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors",
                  selectedMethod === "new_card"
                    ? "border-primary-500 bg-primary-50"
                    : "border-neutral-200 hover:border-neutral-300"
                )}
              >
                <CreditCard className="w-5 h-5 text-neutral-600" />
                <span className="text-sm">
                  {isRTL ? "بطاقة جديدة" : "New Card"}
                </span>
              </button>

              {/* Apple Pay */}
              <button
                type="button"
                onClick={() => handleMethodSelect("apple_pay")}
                className={cn(
                  "col-span-2 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors",
                  selectedMethod === "apple_pay"
                    ? "border-primary-500 bg-primary-50"
                    : "border-neutral-200 hover:border-neutral-300"
                )}
              >
                <Smartphone className="w-5 h-5" />
                <span className="text-sm font-medium">Apple Pay</span>
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {isRTL ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={validateAndSubmit} disabled={isSubmitting || !selectedMethod}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                {isRTL ? "جاري الشحن..." : "Processing..."}
              </>
            ) : (
              <>
                {isRTL ? `شحن ${amount} ر.س` : `Top Up ${amount} SAR`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TopUpDialog;
