import React from 'react';

// FIX: Add new variants from design system
type BadgeVariant = 
  | 'default' 
  | 'secondary' 
  | 'destructive' 
  | 'outline'
  | 'success'
  | 'warning'
  | 'info';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

// Helper function for class merging
function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}

export const Badge = ({
  className = '',
  variant = 'default',
  ...props
}: BadgeProps) => {
  // FIX: Mapped variants to semantic tokens from tailwind.config.js
  const variants: Record<BadgeVariant, string> = {
    default: 
      'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary:
      'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive:
      'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 
      'border border-border text-foreground hover:bg-accent hover:text-accent-foreground',
    // FIX: Added missing status variants
    success:
      'bg-success text-success-foreground hover:bg-success/90',
    warning:
      'bg-warning text-warning-foreground hover:bg-warning/90',
    info:
      'bg-info text-info-foreground hover:bg-info/90',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        variants[variant],
        className
      )}
      {...props}
    />
  );
};
