/**
 * TogglePills - Pill-style toggle buttons for single/multi selection
 * 
 * @description Used for property type selection, filter chips,
 * and quick toggle options throughout the app.
 * 
 * @features
 * - Single or multi-select modes
 * - RTL-first with logical spacing
 * - Icon support
 * - Count badges
 * - Size variants
 */
"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface TogglePillOption<T extends string = string> {
  value: T;
  label: string;
  label_ar?: string;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

interface BaseTogglePillsProps<T extends string = string> {
  /** Available options */
  options: TogglePillOption<T>[];
  /** Current locale */
  locale?: "ar" | "en";
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional class name */
  className?: string;
  /** Pill class name */
  pillClassName?: string;
  /** Disabled state for all */
  disabled?: boolean;
  /** Gap between pills */
  gap?: "sm" | "md" | "lg";
}

interface SingleSelectProps<T extends string = string> extends BaseTogglePillsProps<T> {
  /** Single selection mode */
  multiple?: false;
  /** Current selected value */
  value: T | null;
  /** Callback when selection changes */
  onChange: (value: T | null) => void;
}

interface MultiSelectProps<T extends string = string> extends BaseTogglePillsProps<T> {
  /** Multi-selection mode */
  multiple: true;
  /** Current selected values */
  value: T[];
  /** Callback when selection changes */
  onChange: (values: T[]) => void;
}

export type TogglePillsProps<T extends string = string> =
  | SingleSelectProps<T>
  | MultiSelectProps<T>;

// ============================================================================
// COMPONENT
// ============================================================================

export function TogglePills<T extends string = string>(props: TogglePillsProps<T>) {
  const {
    options,
    locale = "ar",
    size = "md",
    className,
    pillClassName,
    disabled = false,
    gap = "sm",
    multiple,
    value,
    onChange,
  } = props;

  const isRTL = locale === "ar";

  const isSelected = (optionValue: T): boolean => {
    if (multiple) {
      return (value as T[]).includes(optionValue);
    }
    return value === optionValue;
  };

  const handleClick = (optionValue: T) => {
    if (disabled) return;

    if (multiple) {
      const currentValues = value as T[];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter((v) => v !== optionValue)
        : [...currentValues, optionValue];
      (onChange as (values: T[]) => void)(newValues);
    } else {
      // Single select - toggle off if already selected
      const newValue = value === optionValue ? null : optionValue;
      (onChange as (value: T | null) => void)(newValue);
    }
  };

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const gapClasses = {
    sm: "gap-1.5",
    md: "gap-2",
    lg: "gap-3",
  };

  return (
    <div
      className={cn("flex flex-wrap", gapClasses[gap], className)}
      dir={isRTL ? "rtl" : "ltr"}
      role="group"
    >
      {options.map((option) => {
        const selected = isSelected(option.value);
        const label = isRTL && option.label_ar ? option.label_ar : option.label;
        const isDisabled = disabled || option.disabled;

        return (
          <button
            key={option.value}
            type="button"
            role="checkbox"
            aria-checked={selected}
            disabled={isDisabled}
            onClick={() => handleClick(option.value)}
            className={cn(
              "inline-flex items-center justify-center rounded-full border font-medium transition-all",
              sizeClasses[size],
              selected
                ? "bg-primary-500 text-white border-primary-500"
                : "bg-white text-neutral-700 border-neutral-200 hover:border-primary-300 hover:bg-primary-50",
              isDisabled && "opacity-50 cursor-not-allowed",
              pillClassName
            )}
          >
            {option.icon && (
              <span className={cn("me-1.5", size === "sm" && "me-1")}>
                {option.icon}
              </span>
            )}
            {label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "ms-1.5 rounded-full px-1.5 text-xs",
                  selected
                    ? "bg-white/20 text-white"
                    : "bg-neutral-100 text-neutral-500"
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default TogglePills;
