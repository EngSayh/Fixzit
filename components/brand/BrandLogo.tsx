"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Validates and sanitizes a URL to prevent XSS through javascript: or data: URLs
 * Only allows http(s), blob:, and relative paths
 */
function sanitizeImageUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim().toLowerCase();
  // Allow http/https URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return url;
  }
  // Allow blob URLs (for local file previews)
  if (trimmed.startsWith('blob:')) {
    return url;
  }
  // Allow relative paths (start with / but not //)
  if (url.startsWith('/') && !url.startsWith('//')) {
    return url;
  }
  // Block dangerous protocols (javascript:, data:, vbscript:)
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return null;
  }
  // Allow other relative paths
  return url;
}

/**
 * Fetches organization settings including logo URL
 */
async function fetchOrgLogo(): Promise<string | null> {
  try {
    const response = await fetch('/api/organization/settings', {
      cache: 'force-cache',
      next: { revalidate: 300 }, // Revalidate every 5 minutes
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.logo || null;
  } catch {
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
  alt = 'Fixzit',
  fetchOrgLogo: shouldFetchOrgLogo = true,
  rounded = true,
  priority = false,
  variant = 'default',
  logoUrl: customLogoUrl,
  onError,
  'data-testid': testId = 'brand-logo',
}: BrandLogoProps) {
  // Sanitize custom URL to prevent XSS attacks
  const sanitizedCustomUrl = customLogoUrl ? sanitizeImageUrl(customLogoUrl) : null;
  const [logoSrc, setLogoSrc] = useState<string>(sanitizedCustomUrl || DEFAULT_LOGO);
  const [hasError, setHasError] = useState(false);
  
  // Get dimensions from size preset or custom values
  const { width: presetWidth, height: presetHeight, className: sizeClassName } = sizeConfig[size];
  const finalWidth = customWidth || presetWidth;
  const finalHeight = customHeight || presetHeight;
  
  // Fetch org logo if enabled and no custom URL provided
  useEffect(() => {
    if (shouldFetchOrgLogo && !sanitizedCustomUrl) {
      fetchOrgLogo().then((orgLogo) => {
        // Sanitize the fetched URL as well
        const safeOrgLogo = orgLogo ? sanitizeImageUrl(orgLogo) : null;
        if (safeOrgLogo) {
          setLogoSrc(safeOrgLogo);
        }
      });
    }
  }, [shouldFetchOrgLogo, sanitizedCustomUrl]);
  
  // Reset on custom URL change
  useEffect(() => {
    if (sanitizedCustomUrl) {
      setLogoSrc(sanitizedCustomUrl);
      setHasError(false);
    }
  }, [sanitizedCustomUrl]);
  
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
  
  const imageClassName = cn(
    sizeClassName,
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
