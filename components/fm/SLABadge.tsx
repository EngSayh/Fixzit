/**
 * SLA Badge Component
 * 
 * Displays SLA status with color-coded badges:
 * - on_time (green): Within SLA target
 * - at_risk (yellow): Approaching SLA breach
 * - breached (red): SLA breached
 * - paused (gray): SLA timer paused
 * 
 * @module components/fm/SLABadge
 */

"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, XCircle, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/TranslationContext";

export type SLAStatus = "on_time" | "at_risk" | "breached" | "paused" | "not_set";

interface SLABadgeProps {
  /** Current SLA status */
  status: SLAStatus;
  /** Optional time remaining or time since breach */
  timeLabel?: string;
  /** Whether to show the icon */
  showIcon?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

const statusConfig: Record<SLAStatus, {
  labelKey: string;
  fallbackLabel: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  bgClass: string;
  textClass: string;
  icon: React.ElementType;
}> = {
  on_time: {
    labelKey: "fm.sla.onTime",
    fallbackLabel: "On Time",
    variant: "default",
    // Brand token: --color-secondary (#00A859)
    bgClass: "bg-[var(--color-secondary-light,#e6f7f0)] dark:bg-[var(--color-secondary,#00A859)]/20",
    textClass: "text-[var(--color-secondary,#00A859)] dark:text-[var(--color-secondary,#00A859)]",
    icon: Clock,
  },
  at_risk: {
    labelKey: "fm.sla.atRisk",
    fallbackLabel: "At Risk",
    variant: "secondary",
    // Brand token: --color-accent (#FFB400)
    bgClass: "bg-[var(--color-accent-light,#fff8e6)] dark:bg-[var(--color-accent,#FFB400)]/20",
    textClass: "text-[var(--color-accent-hover,#cc9000)] dark:text-[var(--color-accent,#FFB400)]",
    icon: AlertTriangle,
  },
  breached: {
    labelKey: "fm.sla.breached",
    fallbackLabel: "Breached",
    variant: "destructive",
    // Error state - keep semantic red for accessibility
    bgClass: "bg-red-100 dark:bg-red-900/30",
    textClass: "text-red-700 dark:text-red-300",
    icon: XCircle,
  },
  paused: {
    labelKey: "fm.sla.paused",
    fallbackLabel: "Paused",
    variant: "outline",
    bgClass: "bg-gray-100 dark:bg-gray-800",
    textClass: "text-gray-600 dark:text-gray-400",
    icon: Pause,
  },
  not_set: {
    labelKey: "fm.sla.notSet",
    fallbackLabel: "Not Set",
    variant: "outline",
    bgClass: "bg-gray-50 dark:bg-gray-900",
    textClass: "text-gray-400 dark:text-gray-500",
    icon: Clock,
  },
};

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5",
};

const iconSizes = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export function SLABadge({
  status,
  timeLabel,
  showIcon = true,
  size = "md",
  className,
}: SLABadgeProps) {
  const { t } = useTranslation();
  const config = statusConfig[status] || statusConfig.not_set;
  const Icon = config.icon;

  const label = t(config.labelKey) || config.fallbackLabel;

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        config.bgClass,
        config.textClass,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} aria-hidden="true" />}
      <span>{label}</span>
      {timeLabel && (
        <span className="opacity-75">({timeLabel})</span>
      )}
    </Badge>
  );
}

/**
 * Utility function to determine SLA status based on time remaining
 * 
 * @param dueDate - The SLA due date
 * @param warningThresholdMinutes - Minutes before due to show "at_risk" (default: 60)
 * @returns SLA status
 */
export function getSLAStatus(
  dueDate: Date | null | undefined,
  warningThresholdMinutes = 60
): SLAStatus {
  if (!dueDate) return "not_set";

  const now = new Date();
  const timeRemainingMs = dueDate.getTime() - now.getTime();
  const timeRemainingMinutes = timeRemainingMs / (1000 * 60);

  if (timeRemainingMinutes < 0) return "breached";
  if (timeRemainingMinutes <= warningThresholdMinutes) return "at_risk";
  return "on_time";
}

/**
 * Format time remaining for display (English fallback for non-component contexts)
 * For i18n-aware formatting, use useSLATimeLabel hook instead.
 * 
 * @param dueDate - The SLA due date
 * @returns Formatted time string (e.g., "2h 30m" or "Overdue 1h")
 */
export function formatSLATimeRemaining(dueDate: Date | null | undefined): string {
  if (!dueDate) return "";

  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);

  const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
  const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours === 0) {
    return isOverdue ? `Overdue ${minutes}m` : `${minutes}m`;
  }

  return isOverdue ? `Overdue ${hours}h ${minutes}m` : `${hours}h ${minutes}m`;
}

/**
 * Hook for i18n-aware SLA time formatting
 * 
 * @param dueDate - The SLA due date
 * @returns Formatted time string with proper translations
 */
export function useSLATimeLabel(dueDate: Date | null | undefined): string {
  const { t } = useTranslation();

  if (!dueDate) return "";

  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);

  const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
  const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));
  const values = { hours: String(hours), minutes: String(minutes) };

  if (hours === 0) {
    const fallback = isOverdue ? `Overdue ${minutes}m` : `${minutes}m`;
    return t(
      isOverdue ? "fm.sla.overdueMinutes" : "fm.sla.timeRemainingMinutes",
      fallback,
      { minutes: values.minutes }
    );
  }

  const fallback = isOverdue
    ? `Overdue ${hours}h ${minutes}m`
    : `${hours}h ${minutes}m`;

  return t(
    isOverdue ? "fm.sla.overdueTime" : "fm.sla.timeRemaining",
    fallback,
    values
  );
}
