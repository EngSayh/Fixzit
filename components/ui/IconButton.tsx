"use client";

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { SimpleTooltip } from '@/components/ui/tooltip';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Tooltip content - if provided, wraps button in Tooltip */
  tooltip?: string;
  /** Icon to display */
  icon: React.ReactNode;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Visual variant */
  variant?: 'default' | 'ghost' | 'outline' | 'destructive' | 'primary';
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Badge count to show */
  badge?: number;
  /** Whether to show badge as a dot only */
  badgeDot?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const iconSizeClasses = {
  sm: '[&>svg]:h-4 [&>svg]:w-4',
  md: '[&>svg]:h-5 [&>svg]:w-5',
  lg: '[&>svg]:h-6 [&>svg]:w-6',
};

const variantClasses = {
  default: 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
  ghost: 'hover:bg-muted hover:text-foreground',
  outline: 'border border-border bg-background hover:bg-muted',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
};

/**
 * IconButton - A reusable icon button with optional tooltip.
 * 
 * Features:
 * - Built-in tooltip support
 * - Badge/notification dot
 * - Loading state
 * - Multiple size and variant options
 * - Accessible with aria-label
 * 
 * @example
 * ```tsx
 * <IconButton
 *   icon={<Bell />}
 *   tooltip="Notifications"
 *   aria-label="View notifications"
 *   badge={5}
 * />
 * ```
 */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      tooltip,
      icon,
      size = 'md',
      variant = 'ghost',
      loading = false,
      badge,
      badgeDot = false,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const button = (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        className={cn(
          'relative inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          sizeClasses[size],
          iconSizeClasses[size],
          variantClasses[variant],
          className
        )}
        data-cursor-interactive
        {...props}
      >
        {loading ? (
          <span className="animate-spin">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </span>
        ) : (
          icon
        )}
        {children}
        
        {/* Badge */}
        {(badge !== undefined && badge > 0) && !badgeDot && (
          <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        
        {/* Badge Dot */}
        {badgeDot && (
          <span className="absolute -top-0.5 -end-0.5 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
        )}
      </button>
    );

    if (tooltip) {
      return (
        <SimpleTooltip content={tooltip}>
          {button}
        </SimpleTooltip>
      );
    }

    return button;
  }
);

IconButton.displayName = 'IconButton';

export { IconButton };
export default IconButton;
