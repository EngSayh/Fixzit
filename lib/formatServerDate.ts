/**
 * @module lib/formatServerDate
 * @description Server-safe date formatting utilities for Server Components and API routes.
 *
 * These utilities do NOT rely on browser APIs or 'use client' directive.
 * For Client Components, use the i18n date utils from '@/i18n/utils'.
 *
 * @features
 * - Multiple format types (full, long, medium, short, time, date, relative)
 * - Locale-aware formatting (en-US, ar-SA)
 * - Relative date formatting ("2 days ago", "in 3 hours")
 * - Server Component compatible (no client dependencies)
 * - Date parsing from string/number/Date inputs
 *
 * @usage
 * ```typescript
 * const formatted = formatServerDate(new Date(), 'long', 'en-US');
 * const relative = formatRelative(pastDate, 'ar-SA');
 * ```
 */

import { logger } from "@/lib/logger";

export type DateFormatType =
  | "full"
  | "long"
  | "medium"
  | "short"
  | "date-only"
  | "time-only"
  | "relative"
  | "iso";

/**
 * Converts input to Date object safely
 */
function parseDate(date: Date | string | number): Date | null {
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : date;
  }

  if (typeof date === "string" || typeof date === "number") {
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

  const rtf = new Intl.RelativeTimeFormat(locale || "en", { numeric: "auto" });

  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, "second");
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, "day");
  if (Math.abs(diffDay) < 365)
    return rtf.format(Math.floor(diffDay / 30), "month");
  return rtf.format(Math.floor(diffDay / 365), "year");
}

/**
 * Main formatting function with optional timezone support
 */
export function formatDate(
  date: Date,
  format: DateFormatType,
  locale?: string,
  timeZone?: string,
): string {
  const browserLocale = locale || "en-US";
  const options: Intl.DateTimeFormatOptions = timeZone ? { timeZone } : {};

  switch (format) {
    case "full":
      return date.toLocaleString(browserLocale, {
        ...options,
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

    case "long":
      return date.toLocaleString(browserLocale, {
        ...options,
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

    case "medium":
      return date.toLocaleString(browserLocale, {
        ...options,
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

    case "short":
      return date.toLocaleString(browserLocale, {
        ...options,
        year: "numeric",
        month: "numeric",
        day: "numeric",
      });

    case "date-only":
      return date.toLocaleDateString(browserLocale, {
        ...options,
        year: "numeric",
        month: "numeric",
        day: "numeric",
      });

    case "time-only":
      return date.toLocaleTimeString(browserLocale, {
        ...options,
        hour: "2-digit",
        minute: "2-digit",
      });

    case "relative":
      return formatRelative(date, browserLocale);

    case "iso":
      return date.toISOString();

    default:
      // Default to medium format
      return date.toLocaleString(browserLocale, options);
  }
}

/**
 * Utility function for server components that need date strings
 * Safe to use in Server Components (no state/effects)
 */
export function formatServerDate(
  date: Date | string | number,
  format: DateFormatType = "medium",
  locale?: string,
  timeZone?: string,
): string {
  const parsedDate = parseDate(date);

  if (!parsedDate) {
    return "Invalid Date";
  }

  try {
    return formatDate(parsedDate, format, locale, timeZone);
  } catch (_error: unknown) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    // Use logger.error for server-side logging
    logger.error("formatServerDate formatting error", {
      error,
      date,
      format,
      locale,
      timeZone,
    });
    return "Invalid Date";
  }
}
