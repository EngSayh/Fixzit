"use client";

/**
 * ActionFeedback - Inline confirmation component
 * Shows a ✓ checkmark or ✗ error icon that fades after 5 seconds
 * Supports i18n with Arabic and English translations
 * 
 * @module components/ui/action-feedback
 */

import { useState, useEffect, useCallback, forwardRef } from "react";
import { CheckCircle2, XCircle, Loader2, Copy, Save, Trash2, Plus, Send, Download, Upload, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import { Button, type ButtonProps } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";

export type FeedbackType = "success" | "error" | "loading" | "idle";
export type ActionType = "copy" | "save" | "delete" | "add" | "send" | "download" | "upload" | "refresh" | "generic";

// Default i18n keys for action feedback messages
const ACTION_I18N_KEYS: Record<ActionType, { success: string; error: string; loading: string }> = {
  copy: { success: "common.feedback.copied", error: "common.feedback.copyFailed", loading: "common.feedback.copying" },
  save: { success: "common.feedback.saved", error: "common.feedback.saveFailed", loading: "common.feedback.saving" },
  delete: { success: "common.feedback.deleted", error: "common.feedback.deleteFailed", loading: "common.feedback.deleting" },
  add: { success: "common.feedback.added", error: "common.feedback.addFailed", loading: "common.feedback.adding" },
  send: { success: "common.feedback.sent", error: "common.feedback.sendFailed", loading: "common.feedback.sending" },
  download: { success: "common.feedback.downloaded", error: "common.feedback.downloadFailed", loading: "common.feedback.downloading" },
  upload: { success: "common.feedback.uploaded", error: "common.feedback.uploadFailed", loading: "common.feedback.uploading" },
  refresh: { success: "common.feedback.refreshed", error: "common.feedback.refreshFailed", loading: "common.feedback.refreshing" },
  generic: { success: "common.feedback.done", error: "common.feedback.failed", loading: "common.feedback.loading" },
};

interface ActionFeedbackProps {
  type: FeedbackType;
  message?: string;
  className?: string;
  actionType?: ActionType;
  duration?: number;
  onComplete?: () => void;
  /** If true, uses i18n translation for the message */
  useI18nMessage?: boolean;
}

const ACTION_ICONS: Record<ActionType, React.ElementType> = {
  copy: Copy,
  save: Save,
  delete: Trash2,
  add: Plus,
  send: Send,
  download: Download,
  upload: Upload,
  refresh: RefreshCw,
  generic: CheckCircle2,
};

export function ActionFeedback({ 
  type, 
  message, 
  className,
  actionType = "generic",
  duration = 5000,
  onComplete,
  useI18nMessage = true,
}: ActionFeedbackProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(type !== "idle");
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (type === "idle") {
      setVisible(false);
      setFading(false);
      return;
    }

    setVisible(true);
    setFading(false);

    if (type === "success" || type === "error") {
      const fadeTimer = setTimeout(() => setFading(true), duration - 500);
      const hideTimer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, duration);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [type, duration, onComplete]);

  if (!visible) return null;

  const ActionIcon = ACTION_ICONS[actionType];
  
  // Get translated message if using i18n
  const displayMessage = (() => {
    if (message) return message;
    if (!useI18nMessage) return undefined;
    
    const keys = ACTION_I18N_KEYS[actionType];
    if (type === "success") return t(keys.success);
    if (type === "error") return t(keys.error);
    if (type === "loading") return t(keys.loading);
    return undefined;
  })();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-sm transition-opacity duration-500",
        fading && "opacity-0",
        type === "success" && "text-green-600 dark:text-green-400",
        type === "error" && "text-red-600 dark:text-red-400",
        type === "loading" && "text-blue-600 dark:text-blue-400",
        className
      )}
    >
      {type === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
      {type === "success" && (
        <>
          <CheckCircle2 className="h-4 w-4" />
          {actionType !== "generic" && <ActionIcon className="h-3 w-3 opacity-60" />}
        </>
      )}
      {type === "error" && <XCircle className="h-4 w-4" />}
      {displayMessage && <span className="font-medium">{displayMessage}</span>}
    </div>
  );
}

/**
 * Hook for managing action feedback state
 * Messages are automatically translated using i18n
 */
export function useActionFeedback(duration = 5000) {
  const [feedback, setFeedback] = useState<{
    type: FeedbackType;
    message?: string;
    actionType?: ActionType;
  }>({ type: "idle" });

  /**
   * Show success feedback
   * @param message - Optional custom message (if undefined, uses i18n default for actionType)
   * @param actionType - Type of action for icon and default message
   */
  const showSuccess = useCallback((message?: string, actionType: ActionType = "generic") => {
    setFeedback({ type: "success", message, actionType });
  }, []);

  /**
   * Show error feedback
   * @param message - Optional custom message (if undefined, uses i18n default)
   */
  const showError = useCallback((message?: string, actionType: ActionType = "generic") => {
    setFeedback({ type: "error", message, actionType });
  }, []);

  /**
   * Show loading feedback
   * @param message - Optional custom message (if undefined, uses i18n default)
   */
  const showLoading = useCallback((message?: string, actionType: ActionType = "generic") => {
    setFeedback({ type: "loading", message, actionType });
  }, []);

  const reset = useCallback(() => {
    setFeedback({ type: "idle" });
  }, []);

  const FeedbackComponent = useCallback(
    ({ className }: { className?: string }) => (
      <ActionFeedback
        type={feedback.type}
        message={feedback.message}
        actionType={feedback.actionType}
        duration={duration}
        onComplete={reset}
        className={className}
      />
    ),
    [feedback, duration, reset]
  );

  return {
    feedback,
    showSuccess,
    showError,
    showLoading,
    reset,
    FeedbackComponent,
  };
}

// Wrapper component for buttons with inline feedback and tooltip
interface ActionButtonProps extends Omit<ButtonProps, "onClick"> {
  children: React.ReactNode;
  onClick: () => Promise<void> | void;
  actionType?: ActionType;
  /** Custom success message - if undefined, uses i18n default */
  successMessage?: string;
  /** Custom error message - if undefined, uses i18n default */
  errorMessage?: string;
  /** Custom loading message - if undefined, uses i18n default */
  loadingMessage?: string;
  feedbackPosition?: "right" | "below";
  /** Tooltip text (supports i18n - pass translated string) */
  tooltip?: string;
  /** Tooltip position */
  tooltipSide?: "top" | "right" | "bottom" | "left";
}

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  function ActionButton({
    children,
    onClick,
    actionType = "generic",
    successMessage,
    errorMessage,
    loadingMessage,
    className,
    feedbackPosition = "right",
    disabled,
    tooltip,
    tooltipSide = "top",
    variant,
    size,
    ...buttonProps
  }, ref) {
    const { feedback, showSuccess, showError, showLoading, FeedbackComponent } = useActionFeedback();

    const handleClick = async () => {
      try {
        if (loadingMessage !== undefined) showLoading(loadingMessage, actionType);
        await onClick();
        showSuccess(successMessage, actionType);
      } catch {
        showError(errorMessage, actionType);
      }
    };

    const feedbackElement = <FeedbackComponent className={feedbackPosition === "below" ? "mt-1" : "ms-2"} />;

    const buttonElement = (
      <Button
        ref={ref}
        onClick={handleClick}
        disabled={disabled || feedback.type === "loading"}
        variant={variant}
        size={size}
        {...buttonProps}
      >
        {children}
      </Button>
    );

    const wrappedButton = tooltip ? (
      <SimpleTooltip content={tooltip} side={tooltipSide}>
        {buttonElement}
      </SimpleTooltip>
    ) : buttonElement;

    if (feedbackPosition === "below") {
      return (
        <div className={cn("inline-flex flex-col items-start", className)}>
          {wrappedButton}
          {feedbackElement}
        </div>
      );
    }

    return (
      <div className={cn("inline-flex items-center", className)}>
        {wrappedButton}
        {feedbackElement}
      </div>
    );
  }
);
