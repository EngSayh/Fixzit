"use client";

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, Info, AlertCircle, AlertTriangle } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/TranslationContext";

type TooltipVariant = "info" | "help" | "warning" | "error";

interface HoverTooltipProps {
  /** Tooltip content - can be string or ReactNode */
  content: React.ReactNode;
  /** Variant determines the icon style */
  variant?: TooltipVariant;
  /** Size of the trigger icon */
  size?: "xs" | "sm" | "md";
  /** Tooltip placement */
  side?: "top" | "right" | "bottom" | "left";
  /** Additional alignment */
  align?: "start" | "center" | "end";
  /** Custom trigger element (overrides icon) */
  children?: React.ReactNode;
  /** Additional CSS classes for the trigger */
  className?: string;
  /** Show as inline element */
  inline?: boolean;
  /** Delay before showing tooltip (ms) */
  delayDuration?: number;
}

const ICONS: Record<TooltipVariant, React.ComponentType<{ className?: string }>> = {
  info: Info,
  help: HelpCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const VARIANT_STYLES: Record<TooltipVariant, string> = {
  info: "text-blue-500 hover:text-blue-600",
  help: "text-muted-foreground hover:text-foreground",
  warning: "text-yellow-500 hover:text-yellow-600",
  error: "text-red-500 hover:text-red-600",
};

const SIZE_STYLES: Record<string, string> = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
};

/**
 * Contextual hover tooltip for complex UI elements.
 * P123: Optional Enhancement - Hover tooltips for better UX.
 *
 * @example
 * ```tsx
 * // Simple info tooltip
 * <HoverTooltip content="This field is required for invoice generation" />
 *
 * // With custom trigger
 * <HoverTooltip content="Click to edit">
 *   <span className="underline cursor-pointer">Edit</span>
 * </HoverTooltip>
 *
 * // Warning tooltip
 * <HoverTooltip
 *   variant="warning"
 *   content="This action cannot be undone"
 * />
 * ```
 */
export function HoverTooltip({
  content,
  variant = "help",
  size = "sm",
  side = "top",
  align = "center",
  children,
  className,
  inline = true,
  delayDuration = 200,
}: HoverTooltipProps) {
  const { isRTL } = useTranslation();
  const Icon = ICONS[variant];

  // Adjust side for RTL
  const adjustedSide = isRTL
    ? side === "left"
      ? "right"
      : side === "right"
        ? "left"
        : side
    : side;

  const trigger = children ?? (
    <Icon
      className={cn(
        SIZE_STYLES[size],
        VARIANT_STYLES[variant],
        "transition-colors cursor-help"
      )}
      aria-hidden="true"
    />
  );

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger
          asChild={!!children}
          className={cn(
            inline && "inline-flex items-center",
            className
          )}
        >
          {children ? trigger : <span>{trigger}</span>}
        </TooltipTrigger>
        <TooltipContent
          side={adjustedSide}
          align={align}
          className="max-w-xs text-sm"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Tooltip for form field labels.
 */
export function FieldTooltip({
  label,
  tooltip,
  required,
  className,
}: {
  label: string;
  tooltip: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span>
        {label}
        {required && <span className="text-red-500 ms-0.5">*</span>}
      </span>
      <HoverTooltip content={tooltip} size="xs" variant="help" />
    </span>
  );
}

/**
 * Tooltip for status badges with explanation.
 */
export function StatusTooltip({
  status,
  explanation,
  children,
}: {
  status: string;
  explanation: string;
  children: React.ReactNode;
}) {
  return (
    <HoverTooltip
      content={
        <div>
          <div className="font-medium mb-1">{status}</div>
          <div className="text-muted-foreground">{explanation}</div>
        </div>
      }
      variant="info"
    >
      {children}
    </HoverTooltip>
  );
}

/**
 * Tooltip for numeric values with breakdown.
 */
export function ValueTooltip({
  value,
  breakdown,
  children,
}: {
  value: string | number;
  breakdown: { label: string; value: string | number }[];
  children: React.ReactNode;
}) {
  return (
    <HoverTooltip
      content={
        <div className="space-y-1">
          <div className="font-medium border-b pb-1 mb-1">{value}</div>
          {breakdown.map((item, i) => (
            <div key={i} className="flex justify-between gap-4 text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="tabular-nums">{item.value}</span>
            </div>
          ))}
        </div>
      }
      variant="info"
    >
      {children}
    </HoverTooltip>
  );
}

export default HoverTooltip;
