"use client";

/**
 * Reusable CopyButton component with visual confirmation feedback
 * 
 * @module components/ui/copy-button
 * @status IMPLEMENTED [AGENT-0001]
 * @issue UI-COPY-001 - Add visual confirmation for copy actions across codebase
 */

import React, { useState, useCallback } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Copy, Check } from "@/components/ui/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface CopyButtonProps extends Omit<ButtonProps, "onClick" | "onCopy"> {
  /** The text to copy to clipboard */
  value: string;
  /** Label to show when not copied (default: shows icon only) */
  label?: string;
  /** Label to show when copied (default: "Copied!") */
  copiedLabel?: string;
  /** Toast message on success (default: "Copied to clipboard") */
  successMessage?: string;
  /** Toast message on failure (default: "Failed to copy") */
  errorMessage?: string;
  /** Duration to show copied state in ms (default: 2000) */
  copiedDuration?: number;
  /** Show only icon without label */
  iconOnly?: boolean;
  /** Additional callback after successful copy */
  onCopySuccess?: (value: string) => void;
  /** Additional callback on error */
  onCopyError?: (error: Error) => void;
}

/**
 * CopyButton - A button that copies text to clipboard with visual confirmation
 * 
 * Features:
 * - Visual confirmation with checkmark icon
 * - Toast notifications for success/error
 * - Fallback for browsers without Clipboard API
 * - Configurable labels and durations
 * 
 * @example
 * ```tsx
 * <CopyButton value="secret-key-123" label="Copy Key" />
 * <CopyButton value={code} iconOnly size="icon" className="h-6 w-6" />
 * ```
 */
export function CopyButton({
  value,
  label,
  copiedLabel = "Copied!",
  successMessage = "Copied to clipboard",
  errorMessage = "Failed to copy",
  copiedDuration = 2000,
  iconOnly = false,
  onCopySuccess,
  onCopyError,
  className,
  variant = "ghost",
  size = "sm",
  disabled,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (disabled || copied) return;
    
    try {
      // Try Clipboard API first
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback for environments without Clipboard API
        const textArea = document.createElement("textarea");
        textArea.value = value;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "-9999px";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        
        if (!successful) {
          throw new Error("execCommand copy failed");
        }
      }
      
      setCopied(true);
      toast.success(successMessage);
      onCopySuccess?.(value);
      
      setTimeout(() => {
        setCopied(false);
      }, copiedDuration);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast.error(errorMessage);
      onCopyError?.(error);
    }
  }, [value, disabled, copied, successMessage, errorMessage, copiedDuration, onCopySuccess, onCopyError]);

  const Icon = copied ? Check : Copy;
  const displayLabel = copied ? copiedLabel : label;

  return (
    <Button
      variant={variant}
      size={iconOnly ? "icon" : size}
      className={cn(
        "transition-colors duration-200",
        copied && "text-green-600 hover:text-green-600",
        className
      )}
      onClick={handleCopy}
      disabled={disabled || copied}
      aria-label={iconOnly ? (copied ? copiedLabel : "Copy to clipboard") : undefined}
      {...props}
    >
      <Icon className={cn("h-4 w-4", !iconOnly && displayLabel && "me-2")} />
      {!iconOnly && displayLabel}
    </Button>
  );
}

export default CopyButton;
