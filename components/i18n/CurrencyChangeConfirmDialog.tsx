"use client";

import React, { useState, useCallback } from "react";
import { AlertCircle, Check, X } from "@/components/ui/icons";
import { useTranslation } from "@/contexts/TranslationContext";
import type { CurrencyOption } from "@/contexts/CurrencyContext";

interface CurrencyChangeConfirmDialogProps {
  isOpen: boolean;
  fromCurrency: CurrencyOption;
  toCurrency: CurrencyOption;
  preferenceSource: "profile" | "cookie" | "localStorage" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog for currency changes.
 * Shows the source of the current preference and warns about format changes.
 * P117: Currency/Payout UX Enhancement
 */
export default function CurrencyChangeConfirmDialog({
  isOpen,
  fromCurrency,
  toCurrency,
  preferenceSource,
  onConfirm,
  onCancel,
}: CurrencyChangeConfirmDialogProps) {
  const { t, isRTL } = useTranslation();

  if (!isOpen) return null;

  const sourceLabels: Record<typeof preferenceSource, string> = {
    profile: t("settings.currency.sourceProfile", "Your profile settings"),
    cookie: t("settings.currency.sourceCookie", "Browser cookie"),
    localStorage: t("settings.currency.sourceLocal", "Local storage"),
    default: t("settings.currency.sourceDefault", "System default"),
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="currency-change-title"
      aria-describedby="currency-change-desc"
    >
      <div
        className={`relative mx-4 max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${isRTL ? "text-end" : "text-start"}`}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute end-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label={t("common.close", "Close")}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <AlertCircle className="h-6 w-6 text-primary" />
          </div>
          <h2
            id="currency-change-title"
            className="text-lg font-semibold text-foreground"
          >
            {t("settings.currency.changeTitle", "Change Currency?")}
          </h2>
        </div>

        {/* Description */}
        <div id="currency-change-desc" className="space-y-4">
          {/* Currency change preview */}
          <div className="flex items-center justify-center gap-4 rounded-xl bg-muted/50 p-4">
            <div className="text-center">
              <span className="text-2xl">{fromCurrency.flag}</span>
              <div className="mt-1 font-semibold">{fromCurrency.code}</div>
              <div className="text-xs text-muted-foreground">
                {fromCurrency.symbol}
              </div>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="text-center">
              <span className="text-2xl">{toCurrency.flag}</span>
              <div className="mt-1 font-semibold text-primary">
                {toCurrency.code}
              </div>
              <div className="text-xs text-muted-foreground">
                {toCurrency.symbol}
              </div>
            </div>
          </div>

          {/* Current preference source */}
          <p className="text-sm text-muted-foreground">
            {t(
              "settings.currency.currentSource",
              "Current preference saved in:"
            )}{" "}
            <span className="font-medium text-foreground">
              {sourceLabels[preferenceSource]}
            </span>
          </p>

          {/* Warning note */}
          <p className="text-sm text-muted-foreground">
            {t(
              "settings.currency.changeNote",
              "All prices and monetary values will be displayed in the new currency format. Exchange rates are updated daily."
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
          >
            {t("common.cancel", "Cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Check className="h-4 w-4" />
            {t("common.confirm", "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage currency change confirmation state
 * @returns Confirmation dialog state and handlers
 */
export function useCurrencyChangeConfirmation() {
  const [pendingChange, setPendingChange] = useState<{
    from: CurrencyOption;
    to: CurrencyOption;
    source: "profile" | "cookie" | "localStorage" | "default";
  } | null>(null);

  const requestChange = useCallback(
    (
      from: CurrencyOption,
      to: CurrencyOption,
      source: "profile" | "cookie" | "localStorage" | "default" = "localStorage"
    ) => {
      // Skip confirmation if same currency
      if (from.code === to.code) return false;
      setPendingChange({ from, to, source });
      return true;
    },
    []
  );

  const confirm = useCallback(() => {
    const change = pendingChange;
    setPendingChange(null);
    return change;
  }, [pendingChange]);

  const cancel = useCallback(() => {
    setPendingChange(null);
  }, []);

  return {
    isOpen: pendingChange !== null,
    pendingChange,
    requestChange,
    confirm,
    cancel,
  };
}
