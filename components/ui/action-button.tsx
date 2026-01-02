"use client";

/**
 * Reusable ActionButton components with visual confirmation feedback
 *
 * @module components/ui/action-button
 * @status IMPLEMENTED [AGENT-001-A]
 * @issue UI-ACTION-001 - Add visual confirmation for all action buttons across codebase
 */

import React, { useState, useCallback } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Check,
  Save,
  Trash2,
  Plus,
  Send,
  RefreshCw,
  Loader2,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================================
// Types & Configuration
// ============================================================================

export type ActionType = "save" | "delete" | "add" | "create" | "submit" | "update" | "remove";

interface ActionConfig {
  icon: React.ComponentType<{ className?: string }>;
  defaultLabel: string;
  successLabel: string;
  successMessage: string;
  errorMessage: string;
  successVariant?: "success" | "destructive";
}

const ACTION_CONFIGS: Record<ActionType, ActionConfig> = {
  save: {
    icon: Save,
    defaultLabel: "Save",
    successLabel: "Saved!",
    successMessage: "Saved successfully",
    errorMessage: "Failed to save",
    successVariant: "success",
  },
  delete: {
    icon: Trash2,
    defaultLabel: "Delete",
    successLabel: "Deleted!",
    successMessage: "Deleted successfully",
    errorMessage: "Failed to delete",
    successVariant: "destructive",
  },
  add: {
    icon: Plus,
    defaultLabel: "Add",
    successLabel: "Added!",
    successMessage: "Added successfully",
    errorMessage: "Failed to add",
    successVariant: "success",
  },
  create: {
    icon: Plus,
    defaultLabel: "Create",
    successLabel: "Created!",
    successMessage: "Created successfully",
    errorMessage: "Failed to create",
    successVariant: "success",
  },
  submit: {
    icon: Send,
    defaultLabel: "Submit",
    successLabel: "Submitted!",
    successMessage: "Submitted successfully",
    errorMessage: "Failed to submit",
    successVariant: "success",
  },
  update: {
    icon: RefreshCw,
    defaultLabel: "Update",
    successLabel: "Updated!",
    successMessage: "Updated successfully",
    errorMessage: "Failed to update",
    successVariant: "success",
  },
  remove: {
    icon: Trash2,
    defaultLabel: "Remove",
    successLabel: "Removed!",
    successMessage: "Removed successfully",
    errorMessage: "Failed to remove",
    successVariant: "destructive",
  },
};

// ============================================================================
// ActionButton Component
// ============================================================================

export interface ActionButtonProps extends Omit<ButtonProps, "onClick" | "onError"> {
  /** The type of action (determines icon and default labels) */
  actionType: ActionType;
  /** Async action handler - must return Promise */
  onAction: () => Promise<void>;
  /** Custom label (overrides default) */
  label?: string;
  /** Custom success label (overrides default) */
  successLabel?: string;
  /** Custom success message for toast */
  successMessage?: string;
  /** Custom error message for toast */
  errorMessage?: string;
  /** Duration to show success state in ms (default: 2000) */
  successDuration?: number;
  /** Show only icon without label */
  iconOnly?: boolean;
  /** Show loading spinner during action */
  showLoading?: boolean;
  /** Callback after successful action */
  onActionSuccess?: () => void;
  /** Callback on action error */
  onActionError?: (error: Error) => void;
  /** Skip toast notifications */
  skipToast?: boolean;
}

/**
 * ActionButton - A button that performs async actions with visual confirmation
 *
 * Features:
 * - Visual confirmation with checkmark icon after success
 * - Loading spinner during action
 * - Toast notifications for success/error
 * - Configurable labels, icons, and durations
 * - Type-safe action types
 *
 * @example
 * ```tsx
 * <ActionButton
 *   actionType="save"
 *   onAction={async () => { await saveData(); }}
 *   label="Save Changes"
 * />
 *
 * <ActionButton
 *   actionType="delete"
 *   onAction={handleDelete}
 *   iconOnly
 *   variant="destructive"
 * />
 * ```
 */
export function ActionButton({
  actionType,
  onAction,
  label,
  successLabel,
  successMessage,
  errorMessage,
  successDuration = 2000,
  iconOnly = false,
  showLoading = true,
  onActionSuccess,
  onActionError,
  skipToast = false,
  className,
  variant,
  size = "sm",
  disabled,
  children,
  ...props
}: ActionButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const config = ACTION_CONFIGS[actionType];

  const handleAction = useCallback(async () => {
    if (disabled || status === "loading" || status === "success") return;

    setStatus("loading");

    try {
      await onAction();

      setStatus("success");
      if (!skipToast) {
        toast.success(successMessage ?? config.successMessage);
      }
      onActionSuccess?.();

      setTimeout(() => {
        setStatus("idle");
      }, successDuration);
    } catch (err) {
      setStatus("error");
      const error = err instanceof Error ? err : new Error(String(err));
      if (!skipToast) {
        toast.error(errorMessage ?? config.errorMessage);
      }
      onActionError?.(error);

      // Reset to idle after showing error briefly
      setTimeout(() => {
        setStatus("idle");
      }, 1000);
    }
  }, [
    disabled,
    status,
    onAction,
    skipToast,
    successMessage,
    config.successMessage,
    config.errorMessage,
    errorMessage,
    onActionSuccess,
    onActionError,
    successDuration,
  ]);

  // Determine which icon to show
  let Icon: React.ComponentType<{ className?: string }>;
  if (status === "loading" && showLoading) {
    Icon = Loader2;
  } else if (status === "success") {
    Icon = Check;
  } else {
    Icon = config.icon;
  }

  // Determine label
  const displayLabel = status === "success" 
    ? (successLabel ?? config.successLabel) 
    : (label ?? config.defaultLabel);

  // Determine variant based on status
  const effectiveVariant = status === "success"
    ? (config.successVariant === "destructive" ? "outline" : "default")
    : variant;

  return (
    <Button
      variant={effectiveVariant}
      size={iconOnly ? "icon" : size}
      className={cn(
        "transition-all duration-200",
        status === "success" && "text-green-600 border-green-600 hover:text-green-600",
        status === "loading" && "cursor-wait",
        className
      )}
      onClick={handleAction}
      disabled={disabled || status === "loading" || status === "success"}
      aria-label={iconOnly ? displayLabel : undefined}
      aria-busy={status === "loading"}
      {...props}
    >
      <Icon
        className={cn(
          "h-4 w-4",
          !iconOnly && (displayLabel || children) && "me-2",
          status === "loading" && "animate-spin"
        )}
      />
      {!iconOnly && (children ?? displayLabel)}
    </Button>
  );
}

// ============================================================================
// Convenience Components
// ============================================================================

export type SimpleActionButtonProps = Omit<ActionButtonProps, "actionType">;

/**
 * SaveButton - Convenience wrapper for save actions
 */
export function SaveButton(props: SimpleActionButtonProps) {
  return <ActionButton actionType="save" {...props} />;
}

/**
 * DeleteButton - Convenience wrapper for delete actions
 */
export function DeleteButton(props: SimpleActionButtonProps) {
  return <ActionButton actionType="delete" variant="destructive" {...props} />;
}

/**
 * AddButton - Convenience wrapper for add actions
 */
export function AddButton(props: SimpleActionButtonProps) {
  return <ActionButton actionType="add" {...props} />;
}

/**
 * CreateButton - Convenience wrapper for create actions
 */
export function CreateButton(props: SimpleActionButtonProps) {
  return <ActionButton actionType="create" {...props} />;
}

/**
 * SubmitButton - Convenience wrapper for submit actions
 */
export function SubmitButton(props: SimpleActionButtonProps) {
  return <ActionButton actionType="submit" {...props} />;
}

/**
 * UpdateButton - Convenience wrapper for update actions
 */
export function UpdateButton(props: SimpleActionButtonProps) {
  return <ActionButton actionType="update" {...props} />;
}

/**
 * RemoveButton - Convenience wrapper for remove actions
 */
export function RemoveButton(props: SimpleActionButtonProps) {
  return <ActionButton actionType="remove" variant="outline" {...props} />;
}

// ============================================================================
// Hook for manual control
// ============================================================================

export interface UseActionButtonReturn {
  status: "idle" | "loading" | "success" | "error";
  isLoading: boolean;
  isSuccess: boolean;
  execute: () => Promise<void>;
  reset: () => void;
}

/**
 * useActionButton - Hook for manual control of action button state
 *
 * Useful when you need to control the button state from outside
 * or when using custom button implementations
 *
 * @example
 * ```tsx
 * const { status, isLoading, execute } = useActionButton({
 *   onAction: async () => { await saveData(); },
 *   successMessage: "Saved!",
 * });
 *
 * return (
 *   <Button onClick={execute} disabled={isLoading}>
 *     {status === "success" ? <Check /> : <Save />}
 *     {isLoading ? "Saving..." : "Save"}
 *   </Button>
 * );
 * ```
 */
export function useActionButton(options: {
  onAction: () => Promise<void>;
  successMessage?: string;
  errorMessage?: string;
  successDuration?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  skipToast?: boolean;
}): UseActionButtonReturn {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const execute = useCallback(async () => {
    if (status === "loading" || status === "success") return;

    setStatus("loading");

    try {
      await options.onAction();

      setStatus("success");
      if (!options.skipToast && options.successMessage) {
        toast.success(options.successMessage);
      }
      options.onSuccess?.();

      setTimeout(() => {
        setStatus("idle");
      }, options.successDuration ?? 2000);
    } catch (err) {
      setStatus("error");
      const error = err instanceof Error ? err : new Error(String(err));
      if (!options.skipToast && options.errorMessage) {
        toast.error(options.errorMessage);
      }
      options.onError?.(error);

      setTimeout(() => {
        setStatus("idle");
      }, 1000);
    }
  }, [status, options]);

  const reset = useCallback(() => {
    setStatus("idle");
  }, []);

  return {
    status,
    isLoading: status === "loading",
    isSuccess: status === "success",
    execute,
    reset,
  };
}

export default ActionButton;
