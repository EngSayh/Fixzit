"use client";

/**
 * ActionFeedback - Inline confirmation component
 * Shows a ✓ checkmark or ✗ error icon that fades after 5 seconds
 * 
 * @module components/ui/action-feedback
 */

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, Loader2, Copy, Save, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type FeedbackType = "success" | "error" | "loading" | "idle";
export type ActionType = "copy" | "save" | "delete" | "add" | "generic";

interface ActionFeedbackProps {
  type: FeedbackType;
  message?: string;
  className?: string;
  actionType?: ActionType;
  duration?: number;
  onComplete?: () => void;
}

const ACTION_ICONS: Record<ActionType, React.ElementType> = {
  copy: Copy,
  save: Save,
  delete: Trash2,
  add: Plus,
  generic: CheckCircle2,
};

export function ActionFeedback({ 
  type, 
  message, 
  className,
  actionType = "generic",
  duration = 5000,
  onComplete,
}: ActionFeedbackProps) {
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
      {message && <span className="font-medium">{message}</span>}
    </div>
  );
}

// Hook for managing action feedback state
export function useActionFeedback(duration = 5000) {
  const [feedback, setFeedback] = useState<{
    type: FeedbackType;
    message?: string;
    actionType?: ActionType;
  }>({ type: "idle" });

  const showSuccess = useCallback((message?: string, actionType: ActionType = "generic") => {
    setFeedback({ type: "success", message, actionType });
  }, []);

  const showError = useCallback((message?: string) => {
    setFeedback({ type: "error", message });
  }, []);

  const showLoading = useCallback((message?: string) => {
    setFeedback({ type: "loading", message });
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

// Wrapper component for buttons with inline feedback
interface ActionButtonProps {
  children: React.ReactNode;
  onClick: () => Promise<void> | void;
  actionType?: ActionType;
  successMessage?: string;
  errorMessage?: string;
  loadingMessage?: string;
  className?: string;
  feedbackPosition?: "right" | "below";
  disabled?: boolean;
}

export function ActionButton({
  children,
  onClick,
  actionType = "generic",
  successMessage = "Done",
  errorMessage = "Failed",
  loadingMessage,
  className,
  feedbackPosition = "right",
  disabled,
}: ActionButtonProps) {
  const { feedback, showSuccess, showError, showLoading, reset: _reset, FeedbackComponent } = useActionFeedback();

  const handleClick = async () => {
    try {
      if (loadingMessage) showLoading(loadingMessage);
      await onClick();
      showSuccess(successMessage, actionType);
    } catch {
      showError(errorMessage);
    }
  };

  const feedbackElement = <FeedbackComponent className={feedbackPosition === "below" ? "mt-1" : "ms-2"} />;

  if (feedbackPosition === "below") {
    return (
      <div className={cn("inline-flex flex-col items-start", className)}>
        <button onClick={handleClick} disabled={disabled || feedback.type === "loading"}>
          {children}
        </button>
        {feedbackElement}
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center", className)}>
      <button onClick={handleClick} disabled={disabled || feedback.type === "loading"}>
        {children}
      </button>
      {feedbackElement}
    </div>
  );
}
