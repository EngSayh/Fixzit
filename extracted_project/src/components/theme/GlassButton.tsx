'use client';

import { forwardRef } from 'react';
import { cn } from '../../../lib/utils';
import { Loader2 } from 'lucide-react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden';

    const variants = {
      primary: 'glass-weak text-brand-600 border-brand-500/30 hover:bg-brand-500/20 hover:shadow-lg hover:-translate-y-1 focus:ring-brand-500/50',
      accent: 'glass-weak text-accent-600 border-accent-500/30 hover:bg-accent-500/20 hover:shadow-lg hover:-translate-y-1 focus:ring-accent-500/50',
      secondary: 'glass-weak text-gray-700 dark:text-gray-300 border-gray-500/30 hover:bg-gray-500/20 hover:shadow-lg hover:-translate-y-1 focus:ring-gray-500/50',
      ghost: 'text-gray-600 dark:text-gray-400 hover:bg-white/10 hover:text-gray-900 dark:hover:text-gray-100',
      danger: 'glass-weak text-red-600 border-red-500/30 hover:bg-red-500/20 hover:shadow-lg hover:-translate-y-1 focus:ring-red-500/50'
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
      md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
      lg: 'px-6 py-3 text-base rounded-xl gap-2',
      icon: 'p-2.5 rounded-xl'
    };

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          'backdrop-blur-sm border',
          className
        )}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && icon && <span className="shrink-0">{icon}</span>}
        {children && <span>{children}</span>}
        
        {/* Glass shine effect */}
        <div className="absolute inset-0 opacity-0 hover:opacity-20 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12 -translate-x-full hover:translate-x-full" />
      </button>
    );
  }
);

GlassButton.displayName = 'GlassButton';

export default GlassButton;