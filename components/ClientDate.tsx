'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

/**
 * ClientDate Component - SSR-Safe Date Rendering
 * 
 * Prevents hydration mismatches by rendering dates only on the client.
 * Server renders a placeholder, client hydrates with actual formatted date.
 * 
 * @example
 * // Basic usage
 * <ClientDate date={new Date()} />
 * 
 * // With custom format
 * <ClientDate date={invoice.dueDate} format="short" />
 * 
 * // With custom locale
 * <ClientDate date={payment.date} locale="ar-SA" />
 * 
 * // Relative time
 * <ClientDate date={ticket.createdAt} format="relative" />
 */

interface ClientDateProps {
  /** The date to format - can be Date object, ISO string, or timestamp */
  date: Date | string | number;
  
  /** Format style */
  format?: 'full' | 'long' | 'medium' | 'short' | 'date-only' | 'time-only' | 'relative' | 'iso';
  
  /** Locale override (defaults to browser locale) */
  locale?: string;
  
  /** Custom format function */
  formatter?: (_date: Date, _locale?: string) => string;
  
  /** Placeholder text during SSR/before hydration */
  placeholder?: string;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Fallback text if date is invalid */
  fallback?: string;
}

/**
 * Converts input to Date object safely
 */
function parseDate(date: Date | string | number): Date | null {
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : date;
  }
  
  if (typeof date === 'string' || typeof date === 'number') {
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  return null;
}

/**
 * Formats date relative to now (e.g., "2 hours ago", "in 3 days")
 */
function formatRelative(date: Date, locale?: string): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  const rtf = new Intl.RelativeTimeFormat(locale || 'en', { numeric: 'auto' });
  
  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour');
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day');
  if (Math.abs(diffDay) < 365) return rtf.format(Math.floor(diffDay / 30), 'month');
  return rtf.format(Math.floor(diffDay / 365), 'year');
}

/**
 * Main formatting function
 */
function formatDate(date: Date, format: ClientDateProps['format'], locale?: string, formatter?: ClientDateProps['formatter']): string {
  // Custom formatter takes precedence
  if (formatter) {
    return formatter(date, locale);
  }
  
  const browserLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  
  switch (format) {
    case 'full':
      return date.toLocaleString(browserLocale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
    case 'long':
      return date.toLocaleString(browserLocale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
    case 'medium':
      return date.toLocaleString(browserLocale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
    case 'short':
      return date.toLocaleString(browserLocale, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
      
    case 'date-only':
      return date.toLocaleDateString(browserLocale, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
      
    case 'time-only':
      return date.toLocaleTimeString(browserLocale, {
        hour: '2-digit',
        minute: '2-digit'
      });
      
    case 'relative':
      return formatRelative(date, browserLocale);
      
    case 'iso':
      return date.toISOString();
      
    default:
      // Default to medium format
      return date.toLocaleString(browserLocale);
  }
}

/**
 * ClientDate Component Implementation
 */
export default function ClientDate({
  date,
  format = 'medium',
  locale,
  formatter,
  placeholder = '...',
  className = '',
  fallback = 'Invalid Date'
}: ClientDateProps) {
  const [mounted, setMounted] = useState(false);
  const [formattedDate, setFormattedDate] = useState<string>(placeholder);
  
  useEffect(() => {
    setMounted(true);
    
    const parsedDate = parseDate(date);
    
    if (!parsedDate) {
      setFormattedDate(fallback);
      return;
    }
    
    try {
      const formatted = formatDate(parsedDate, format, locale, formatter);
      setFormattedDate(formatted);
    } catch (error) {
      logger.error('ClientDate formatting error', { error });
      setFormattedDate(fallback);
    }
  }, [date, format, locale, formatter, fallback]);
  
  // Server renders placeholder, client hydrates with actual date
  if (!mounted) {
    return <span className={className}>{placeholder}</span>;
  }
  
  return <span className={className}>{formattedDate}</span>;
}

/**
 * Utility function for server components that need date strings
 * Safe to use in Server Components (no state/effects)
 */
export function formatServerDate(
  date: Date | string | number,
  format: ClientDateProps['format'] = 'medium',
  locale?: string
): string {
  const parsedDate = parseDate(date);
  
  if (!parsedDate) {
    return 'Invalid Date';
  }
  
  try {
    return formatDate(parsedDate, format, locale);
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Hook for using formatted dates in client components
 * Returns null during SSR, formatted string on client
 */
export function useClientDate(
  date: Date | string | number,
  format: ClientDateProps['format'] = 'medium',
  locale?: string
): string | null {
  const [formatted, setFormatted] = useState<string | null>(null);
  
  useEffect(() => {
    const parsedDate = parseDate(date);
    
    if (!parsedDate) {
      setFormatted('Invalid Date');
      return;
    }
    
    try {
      setFormatted(formatDate(parsedDate, format, locale));
    } catch {
      setFormatted('Invalid Date');
    }
  }, [date, format, locale]);
  
  return formatted;
}
