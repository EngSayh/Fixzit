'use client';

import { forwardRef } from 'react';
import { cn } from '../../../lib/utils';
import { Eye, EyeOff, Search } from 'lucide-react';
import { useState } from 'react';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'search' | 'password';
  containerClassName?: string;
}

const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ 
    className, 
    label, 
    error, 
    icon, 
    rightIcon, 
    variant = 'default',
    containerClassName,
    type,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState(false);

    const inputType = variant === 'password' ? (showPassword ? 'text' : 'password') : type;
    const hasIcon = icon || variant === 'search';
    const hasRightIcon = rightIcon || variant === 'password';

    return (
      <div className={cn('space-y-2', containerClassName)}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        
        <div className="relative">
          {/* Left Icon */}
          {hasIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              {icon || (variant === 'search' && <Search className="h-4 w-4" />)}
            </div>
          )}
          
          {/* Input */}
          <input
            ref={ref}
            type={inputType}
            className={cn(
              'w-full input-glass text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
              hasIcon && 'pl-10',
              hasRightIcon && 'pr-10',
              focused && 'ring-2 ring-brand-500/50 border-brand-500/50',
              error && 'ring-2 ring-red-500/50 border-red-500/50',
              className
            )}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            {...props}
          />
          
          {/* Right Icon */}
          {hasRightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightIcon}
              {variant === 'password' && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
            </div>
          )}
          
          {/* Focus glow */}
          {focused && (
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500/20 via-transparent to-accent-500/20 pointer-events-none -z-10 blur-xl" />
          )}
        </div>
        
        {/* Error Message */}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <span className="w-1 h-1 bg-red-500 rounded-full" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';

export default GlassInput;