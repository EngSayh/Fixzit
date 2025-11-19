'use client';

import React from 'react';

interface FeatureToggleProps {
  /**
   * Unique identifier for the feature
   */
  id: string;
  
  /**
   * Display name of the feature
   */
  label: string;
  
  /**
   * Optional description or help text
   */
  description?: string;
  
  /**
   * Current state of the toggle
   */
  enabled: boolean;
  
  /**
   * Callback when toggle state changes
   */
  onChange: (enabled: boolean) => void;
  
  /**
   * Whether the toggle is disabled
   */
  disabled?: boolean;
  
  /**
   * Show loading state
   */
  loading?: boolean;
  
  /**
   * Show warning badge (e.g., "Beta", "Experimental")
   */
  badge?: string;
  
  /**
   * Danger mode - shows red when enabled (for destructive features)
   */
  danger?: boolean;
  
  /**
   * Show lock icon (feature requires upgrade)
   */
  locked?: boolean;
  
  /**
   * Callback when locked feature is clicked
   */
  onLockedClick?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * iOS-style Feature Toggle Component
 * 
 * Used for admin settings to enable/disable features across the platform.
 * Includes accessibility features, loading states, and premium indicators.
 * 
 * @example
 * ```tsx
 * <FeatureToggle
 *   id="referral-program"
 *   label="Referral Program"
 *   description="Allow users to refer others and earn rewards"
 *   enabled={settings.referralProgram}
 *   onChange={(enabled) => updateSetting('referralProgram', enabled)}
 *   badge="New"
 * />
 * ```
 */
export const FeatureToggle: React.FC<FeatureToggleProps> = ({
  id,
  label,
  description,
  enabled,
  onChange,
  disabled = false,
  loading = false,
  badge,
  danger = false,
  locked = false,
  onLockedClick,
  className = ''
}) => {
  const handleToggle = (checked: boolean) => {
    if (locked && onLockedClick) {
      onLockedClick();
      return;
    }
    
    if (!locked && !loading && !disabled) {
      onChange(checked);
    }
  };

  // `toggleColor` was previously computed but unused; styling is handled inline in the JSX

  return (
    <div 
      className={`flex items-center justify-between py-3 px-4 rounded-2xl hover:bg-muted dark:hover:bg-gray-800 transition-colors ${className}`}
      data-feature-id={id}
    >
      {/* Left Side: Label & Description */}
      <div className="flex-1 min-w-0 me-4">
        <div className="flex items-center gap-2">
          <label 
            htmlFor={id}
            className="text-sm font-medium text-foreground dark:text-white cursor-pointer"
          >
            {label}
          </label>
          
          {/* Badge */}
          {badge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary dark:bg-primary dark:text-primary">
              {badge}
            </span>
          )}
          
          {/* Lock Icon */}
          {locked && (
            <svg 
              className="w-4 h-4 text-muted-foreground" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
          )}
        </div>
        
        {/* Description */}
        {description && (
          <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      
      {/* Right Side: Toggle Switch */}
      <div className="flex-shrink-0">
        {loading ? (
          /* Loading Spinner */
          <div className="inline-flex h-6 w-11 items-center justify-center">
            <svg 
              className="animate-spin h-5 w-5 text-muted-foreground" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : (
          <button
            id={id}
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={`Toggle ${label}`}
            disabled={disabled}
            onClick={() => handleToggle(!enabled)}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${locked ? 'cursor-help' : ''}
              ${danger && enabled ? 'focus:ring-red-500 bg-destructive' : enabled ? 'focus:ring-green-500 bg-success' : 'focus:ring-gray-400 bg-muted'}
            `}
          >
            {/* Toggle Knob */}
            <span
              aria-hidden="true"
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card shadow ring-0 transition duration-200 ease-in-out
                ${enabled ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Feature Toggle Group Component
 * 
 * Groups related feature toggles with a section header
 */
interface FeatureToggleGroupProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const FeatureToggleGroup: React.FC<FeatureToggleGroupProps> = ({
  title,
  description,
  children,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="px-4 py-2">
        <h3 className="text-base font-semibold text-foreground dark:text-white">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="bg-card dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-700 divide-y divide-border dark:divide-gray-700">
        {children}
      </div>
    </div>
  );
};

export default FeatureToggle;
