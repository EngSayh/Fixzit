"use client";

/**
 * Icon Component - DGA Design System Compliant
 *
 * Features:
 * - Default 1.5px stroke weight (DGA standard)
 * - Pre-defined size variants (xs, sm, md, lg, xl)
 * - RTL-aware with logical properties
 * - 44px minimum touch target for IconButton
 * - Semantic color variants
 *
 * @example
 * // Basic usage
 * <Icon icon={Bell} />
 *
 * // With size
 * <Icon icon={Settings} size="lg" />
 *
 * // IconButton with action
 * <IconButton icon={X} onClick={handleClose} label="Close" />
 */

import React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon, LucideProps } from "lucide-react";

// DGA-compliant size variants
export const iconSizeMap = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export type IconSize = keyof typeof iconSizeMap;

// Semantic color variants aligned with Fixzit brand tokens
export const iconColorMap = {
  default: "text-current",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
  muted: "text-muted-foreground",
} as const;

export type IconColor = keyof typeof iconColorMap;

export interface IconProps extends Omit<LucideProps, "size"> {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Predefined size variant */
  size?: IconSize;
  /** Semantic color variant */
  color?: IconColor;
  /** Custom className override */
  className?: string;
  /** Accessibility label (defaults to sr-only) */
  "aria-label"?: string;
}

/**
 * Core Icon component with DGA-compliant defaults
 */
export function Icon({
  icon: IconComponent,
  size = "md",
  color = "default",
  className,
  strokeWidth = 1.5,
  "aria-label": ariaLabel,
  ...props
}: IconProps) {
  return (
    <IconComponent
      size={iconSizeMap[size]}
      strokeWidth={strokeWidth}
      className={cn(iconColorMap[color], className)}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      {...props}
    />
  );
}

export interface IconButtonProps {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Click handler */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Accessibility label (required) */
  label: string;
  /** Button variant */
  variant?: "ghost" | "outline" | "solid";
  /** Disabled state */
  disabled?: boolean;
  /** Icon size */
  size?: IconSize;
  /** Icon color */
  color?: IconColor;
  /** Additional icon className */
  className?: string;
  /** Additional button className */
  buttonClassName?: string;
}

/**
 * IconButton with 44px minimum touch target (DGA accessibility requirement)
 */
export function IconButton({
  icon,
  onClick,
  label,
  variant = "ghost",
  disabled = false,
  size = "md",
  color = "default",
  className,
  buttonClassName,
}: IconButtonProps) {
  const variantClasses = {
    ghost: "hover:bg-accent hover:text-accent-foreground",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
    solid: "bg-primary text-primary-foreground hover:bg-primary/90",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        // 44px minimum touch target
        "inline-flex min-h-[44px] min-w-[44px] items-center justify-center",
        "rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        buttonClassName
      )}
    >
      <Icon
        icon={icon}
        size={size}
        color={color}
        className={className}
      />
    </button>
  );
}

// Re-export types for convenience
export type { LucideIcon, LucideProps };
