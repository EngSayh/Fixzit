'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { formatDate as formatDateUtil, formatServerDate as formatServerDateUtil } from '@/lib/formatServerDate';

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
  
  /** Timezone override (e.g., 'Asia/Riyadh') */
  timeZone?: string;
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
 * Main formatting function (wraps shared utility)
 */
function formatDate(
  date: Date,
  format: ClientDateProps['format'],
  locale?: string,
  timeZone?: string,
  formatter?: ClientDateProps['formatter']
): string {
  // Custom formatter takes precedence
  if (formatter) {
    return formatter(date, locale);
  }

  const browserLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  return formatDateUtil(date, format || 'medium', browserLocale, timeZone);
}/**
 * ClientDate Component Implementation
 */
export default function ClientDate({
  date,
  format = 'medium',
  locale,
  formatter,
  placeholder = '...',
  className = '',
  fallback = 'Invalid Date',
  timeZone
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
      const formatted = formatDate(parsedDate, format, locale, timeZone, formatter);
      setFormattedDate(formatted);
    } catch (error) {
      logger.error('ClientDate formatting error', { error });
      setFormattedDate(fallback);
    }
  }, [date, format, locale, timeZone, formatter, fallback]);

  // Server renders placeholder, client hydrates with actual date
  if (!mounted) {
    return <span className={className}>{placeholder}</span>;
  }

  return <span className={className}>{formattedDate}</span>;
}

/**
 * Re-export formatServerDate from shared module for convenience
 * This function is safe to use in Server Components
 */
export const formatServerDate = formatServerDateUtil;

/**
 * Hook for using formatted dates in client components
 * Returns null during SSR, formatted string on client
 */
export function useClientDate(
  date: Date | string | number,
  format: ClientDateProps['format'] = 'medium',
  locale?: string,
  timeZone?: string
): string | null {
  const [formatted, setFormatted] = useState<string | null>(null);

  useEffect(() => {
    const parsedDate = parseDate(date);

    if (!parsedDate) {
      setFormatted('Invalid Date');
      return;
    }

    try {
      setFormatted(formatDateUtil(parsedDate, format, locale, timeZone));
    } catch (error: unknown) {
      logger.error('useClientDate formatting error', { error, date, format, locale, timeZone });
      setFormatted('Invalid Date');
    }
  }, [date, format, locale, timeZone]);

  return formatted;
}