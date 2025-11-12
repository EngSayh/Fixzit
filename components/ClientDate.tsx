'use client';

/**
 * CLIENT-ONLY DATE COMPONENT
 * 
 * Prevents hydration mismatches by rendering dates only on the client.
 * Server-side rendering shows a placeholder to avoid layout shift.
 * 
 * WHY: Date formatting depends on client timezone, which differs from server.
 * Using new Date().toLocaleDateString() on server causes hydration mismatch.
 * 
 * USAGE:
 * ```tsx
 * import ClientDate from '@/components/ClientDate';
 * 
 * // Basic usage
 * <ClientDate date={invoice.dueDate} />
 * 
 * // With custom format
 * <ClientDate date={ticket.createdAt} format="datetime" />
 * 
 * // With locale
 * <ClientDate date={payment.paymentDate} format="short" locale="ar" />
 * ```
 */

import { useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

interface ClientDateProps {
  date: Date | string | number | null | undefined;
  format?: 'date' | 'datetime' | 'short' | 'long';
  locale?: 'en' | 'ar';
  fallback?: string;
  className?: string;
}

/**
 * Client-side date formatter that prevents hydration mismatches
 */
export default function ClientDate({ 
  date, 
  format = 'date', 
  locale: propLocale,
  fallback = '—',
  className 
}: ClientDateProps) {
  const { locale: contextLocale } = useTranslation();
  const locale = propLocale || contextLocale;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Server-side: render placeholder to match client structure
  if (!mounted) {
    return <span className={className}>{fallback}</span>;
  }

  // Client-side: render actual formatted date
  if (date == null) {
    return <span className={className}>{fallback}</span>;
  }

  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return <span className={className}>{fallback}</span>;
    }

    const localeCode = locale === 'ar' ? 'ar-SA' : 'en-GB';
    let options: Intl.DateTimeFormatOptions;

    switch (format) {
      case 'datetime':
        options = { dateStyle: 'medium', timeStyle: 'short' };
        break;
      case 'short':
        options = { dateStyle: 'short' };
        break;
      case 'long':
        options = { dateStyle: 'long' };
        break;
      default:
        options = { dateStyle: 'medium' };
    }

    const formatted = new Intl.DateTimeFormat(localeCode, options).format(dateObj);
    
    return <span className={className}>{formatted}</span>;
  } catch (error) {
    console.error('ClientDate formatting error:', error);
    return <span className={className}>{fallback}</span>;
  }
}
