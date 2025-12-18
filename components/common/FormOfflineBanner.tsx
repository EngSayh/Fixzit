"use client";

import React from "react";
import { WifiOff, AlertTriangle, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/TranslationContext";
import { useOnlineStatus } from "./OfflineIndicator";

interface FormOfflineBannerProps {
  /** Type of form for contextual messaging */
  formType: "rfq" | "work-order" | "invoice" | "property" | "general";
  /** Whether the form has unsaved changes */
  hasUnsavedChanges?: boolean;
  /** Whether local draft saving is enabled */
  draftSavingEnabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const FORM_TYPE_LABELS = {
  rfq: "RFQ",
  "work-order": "Work Order",
  invoice: "Invoice",
  property: "Property",
  general: "Form",
} as const;

/**
 * Per-page offline banner for long-lived forms.
 * Shows contextual warnings and draft save status when offline.
 * P118: Offline/Retry UX Enhancement
 *
 * @example
 * ```tsx
 * <FormOfflineBanner
 *   formType="rfq"
 *   hasUnsavedChanges={isDirty}
 *   draftSavingEnabled={true}
 * />
 * ```
 */
export function FormOfflineBanner({
  formType,
  hasUnsavedChanges = false,
  draftSavingEnabled = false,
  className,
}: FormOfflineBannerProps) {
  const { t, isRTL } = useTranslation();
  const { isOnline } = useOnlineStatus();

  // Only show when offline
  if (isOnline) {
    return null;
  }

  const formLabel = FORM_TYPE_LABELS[formType];

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "rounded-xl border p-4 mb-4",
        hasUnsavedChanges && !draftSavingEnabled
          ? "border-destructive/50 bg-destructive/10 text-destructive"
          : "border-warning/50 bg-warning/10 text-warning-foreground",
        className
      )}
    >
      <div className={cn("flex items-start gap-3", isRTL && "flex-row-reverse")}>
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {hasUnsavedChanges && !draftSavingEnabled ? (
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
          ) : (
            <WifiOff className="h-5 w-5 text-warning" aria-hidden />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1">
          <p className="font-medium">
            {t(
              "common.offline.formTitle",
              "You're currently offline"
            )}
          </p>

          {hasUnsavedChanges && !draftSavingEnabled ? (
            <p className="text-sm opacity-90">
              {t(
                "common.offline.unsavedWarning",
                `Your ${formLabel} has unsaved changes. Stay on this page and submit when you're back online to avoid losing your work.`
              ).replace("${formLabel}", formLabel)}
            </p>
          ) : hasUnsavedChanges && draftSavingEnabled ? (
            <p className="text-sm opacity-90 flex items-center gap-2">
              <Save className="h-4 w-4" aria-hidden />
              {t(
                "common.offline.draftSaved",
                `Your ${formLabel} draft is saved locally. It will sync automatically when you're back online.`
              ).replace("${formLabel}", formLabel)}
            </p>
          ) : (
            <p className="text-sm opacity-90">
              {t(
                "common.offline.formLimited",
                `Some ${formLabel} features may be limited. You can continue editing, and changes will sync when you're back online.`
              ).replace("${formLabel}", formLabel)}
            </p>
          )}

          {/* Action hint */}
          <p className="text-xs opacity-75 mt-2">
            {t(
              "common.offline.retryHint",
              "We'll automatically retry when your connection is restored."
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Minimal inline offline indicator for form submit buttons
 */
export function SubmitOfflineWarning({
  className,
}: {
  className?: string;
}) {
  const { t } = useTranslation();
  const { isOnline } = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-warning",
        className
      )}
    >
      <WifiOff className="h-3 w-3" aria-hidden />
      {t("common.offline.submitDisabled", "Offline - will submit when online")}
    </span>
  );
}

export default FormOfflineBanner;
