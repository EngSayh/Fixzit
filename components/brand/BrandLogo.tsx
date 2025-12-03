"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';
import { logger } from '@/lib/logger';

/**
 * Fetches organization settings including logo URL
 * 
 * SECURITY: Uses no-store to avoid cross-tenant logo caching.
 * Each session/page load gets fresh org settings to prevent
 * stale or cross-tenant branding on shared devices.
 * 
 * @param signal - AbortSignal for request cancellation on component unmount
 */
async function fetchOrgLogo(signal?: AbortSignal): Promise<string | null> {
  try {
    // NOTE: cache: 'no-store' is required for tenant-scoped resources
    // to prevent cross-tenant branding after logout/org switch.
    // The 'next' option is ignored in client-side fetch (browser fetch API).
    const response = await fetch('/api/organization/settings', {
      cache: 'no-store', // Tenant-specific, avoid reuse across sessions
      credentials: 'include', // Include cookies for session-based org resolution
      signal, // Allow cancellation on unmount
    });
    
    if (!response.ok) {
      // Log non-OK responses for debugging branding issues
      logger.warn('[BrandLogo] Failed to fetch org settings', {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }
    
    const data = await response.json();
    return data.logo || null;
  } catch (err) {
    // Don't log abort errors (expected on component unmount)
    if (err instanceof Error && err.name === 'AbortError') {
      return null;
    }
    // Log unexpected fetch errors for debugging
    logger.warn('[BrandLogo] Error fetching org logo', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const sizeConfig: Record<BrandLogoSize, { width: number; height: number; className: string }> = {
  xs: { width: 24, height: 24, className: 'w-6 h-6' },
  sm: { width: 32, height: 32, className: 'w-8 h-8' },
  md: { width: 48, height: 48, className: 'w-12 h-12' },
  lg: { width: 64, height: 64, className: 'w-16 h-16' },
  xl: { width: 80, height: 80, className: 'w-20 h-20' },
  // NOTE: w-30/h-30 are not valid Tailwind classes. Using arbitrary values.
  '2xl': { width: 120, height: 120, className: 'w-[120px] h-[120px]' },
};

export interface BrandLogoProps {
  /**
   * Size preset for the logo
   * @default 'md'
   */
  size?: BrandLogoSize;
  
  /**
   * Custom width (overrides size preset)
   */
  width?: number;
  
  /**
   * Custom height (overrides size preset)
   */
  height?: number;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Alt text for accessibility
   * @default 'Fixzit'
   */
  alt?: string;
  
  /**
   * Whether to fetch org logo dynamically
   * Set to false for static pages (login/signup) for faster initial load
   * @default true
   */
  fetchOrgLogo?: boolean;
  
  /**
   * Show rounded corners
   * @default true
   */
  rounded?: boolean;
  
  /**
   * Priority loading (for above-fold logos)
   * @default false
   */
  priority?: boolean;
  
  /**
   * Variant for different visual styles
   * @default 'default'
   */
  variant?: 'default' | 'card' | 'minimal';
  
  /**
   * Custom logo URL (overrides org fetch and default)
   */
  logoUrl?: string;
  
  /**
   * Callback when image fails to load
   */
  onError?: () => void;
  
  /**
   * Test ID for testing
   */
  'data-testid'?: string;
}

const DEFAULT_LOGO = '/img/fixzit-logo.png';

/**
 * BrandLogo - Reusable brand logo component
 * 
 * Used across the application for consistent logo display:
 * - TopBar (header navigation)
 * - Login page
 * - Signup page
 * - Logout page
 * - Error pages
 * 
 * Features:
 * - Dynamic org logo fetching from /api/organization/settings
 * - Fallback to default Fixzit logo
 * - Multiple size presets
 * - Responsive and accessible
 * - Test environment compatible
 */
export function BrandLogo({
  size = 'md',
  width: customWidth,
  height: customHeight,
  className,
  alt: customAlt,
  fetchOrgLogo: shouldFetchOrgLogo = true,
  rounded = true,
  priority = false,
  variant = 'default',
  logoUrl: customLogoUrl,
  onError,
  'data-testid': testId = 'brand-logo',
}: BrandLogoProps) {
  const { t } = useTranslation();
  const [logoSrc, setLogoSrc] = useState<string>(customLogoUrl || DEFAULT_LOGO);
  const [hasError, setHasError] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Use custom alt or localized default alt text for accessibility
  const alt = customAlt || t('brand.logoAlt', 'Fixzit Logo');
  
  // Get dimensions from size preset or custom values
  const { width: presetWidth, height: presetHeight, className: sizeClassName } = sizeConfig[size];
  const finalWidth = customWidth || presetWidth;
  const finalHeight = customHeight || presetHeight;
  
  // Fetch org logo if enabled and no custom URL provided
  useEffect(() => {
    if (shouldFetchOrgLogo && !customLogoUrl) {
      // Cancel any previous fetch
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      fetchOrgLogo(controller.signal).then((orgLogo) => {
        if (orgLogo) {
          setLogoSrc(orgLogo);
        }
      });
      
      // Cleanup: abort on unmount
      return () => {
        controller.abort();
      };
    }
  }, [shouldFetchOrgLogo, customLogoUrl]);
  
  // Reset on custom URL change
  useEffect(() => {
    if (customLogoUrl) {
      setLogoSrc(customLogoUrl);
      setHasError(false);
    }
  }, [customLogoUrl]);
  
  const handleError = () => {
    setHasError(true);
    if (logoSrc !== DEFAULT_LOGO) {
      setLogoSrc(DEFAULT_LOGO);
    }
    onError?.();
  };
  
  // Variant styles
  const variantStyles = {
    default: '',
    card: 'bg-card p-2 shadow-lg',
    minimal: '',
  };
  
  // FIX: When custom dimensions are provided, don't apply preset size classes
  // This allows callers to set arbitrary logo dimensions without being overridden
  const useCustomDimensions = customWidth !== undefined || customHeight !== undefined;
  
  const imageClassName = cn(
    // Only apply preset size class when no custom dimensions are provided
    !useCustomDimensions && sizeClassName,
    rounded && 'rounded-2xl',
    'object-contain',
    variantStyles[variant],
    className
  );
  
  // Test environment: use native img for compatibility
  if (process.env.NODE_ENV === 'test') {
    return (
      <img
        src={logoSrc}
        alt={alt}
        width={finalWidth}
        height={finalHeight}
        className={imageClassName}
        onError={handleError}
        data-testid={testId}
      />
    );
  }
  
  return (
    <Image
      src={hasError ? DEFAULT_LOGO : logoSrc}
      alt={alt}
      width={finalWidth}
      height={finalHeight}
      className={imageClassName}
      onError={handleError}
      priority={priority}
      data-testid={testId}
    />
  );
}

/**
 * BrandLogoWithBadge - Logo with additional badge/label
 * Used for login/signup pages with a card background
 */
export function BrandLogoWithCard({
  size = 'xl',
  className,
  ...props
}: Omit<BrandLogoProps, 'variant'>) {
  return (
    <div className={cn(
      'inline-flex items-center justify-center bg-card p-4 rounded-2xl shadow-lg',
      className
    )}>
      <BrandLogo
        size={size}
        variant="minimal"
        rounded
        priority
        {...props}
      />
    </div>
  );
}

export default BrandLogo;
