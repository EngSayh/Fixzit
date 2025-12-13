import { formatCurrency as formatCurrencyDisplay } from "@/lib/currency-formatter";

export type DateInput = Date | number | string | null | undefined;

function normalizeDate(value: DateInput): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/**
 * Safely parse any supported date input.
 * Falls back to the provided fallback value (or current date) when the
 * input is missing/invalid to avoid runtime `Invalid Date` issues.
 */
export function parseDate(
  value: DateInput,
  fallback: Date | (() => Date) = () => new Date(),
): Date {
  const resolved = normalizeDate(value);
  if (resolved) {
    return resolved;
  }

  const fallbackValue =
    typeof fallback === "function" ? (fallback as () => Date)() : fallback;
  const normalizedFallback = normalizeDate(fallbackValue);
  return normalizedFallback ?? new Date();
}

/**
 * Format date with consistent locale handling.
 * Uses the browser's locale by default, with Saudi Arabia (ar-SA) as fallback.
 *
 * @param value - Date input to format
 * @param style - Date formatting style
 * @param locale - Optional locale override
 */
export function formatDate(
  value: DateInput,
  style: "full" | "long" | "medium" | "short" | "date-only" | "time-only" = "medium",
  locale?: string,
): string {
  const date = parseDate(value);
  const resolvedLocale = locale || (typeof navigator !== "undefined" ? navigator.language : "ar-SA");

  try {
    switch (style) {
      case "date-only":
        return new Intl.DateTimeFormat(resolvedLocale, {
          year: "numeric",
          month: "short",
          day: "numeric",
        }).format(date);

      case "time-only":
        return new Intl.DateTimeFormat(resolvedLocale, {
          hour: "2-digit",
          minute: "2-digit",
        }).format(date);

      case "full":
        return new Intl.DateTimeFormat(resolvedLocale, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(date);

      case "long":
        return new Intl.DateTimeFormat(resolvedLocale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(date);

      case "short":
        return new Intl.DateTimeFormat(resolvedLocale, {
          year: "2-digit",
          month: "numeric",
          day: "numeric",
        }).format(date);

      case "medium":
      default:
        return new Intl.DateTimeFormat(resolvedLocale, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(date);
    }
  } catch {
    return date.toISOString();
  }
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days").
 *
 * @param value - Date input
 * @param locale - Optional locale override
 */
export function formatRelativeTime(value: DateInput, locale?: string): string {
  const date = parseDate(value);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  const resolvedLocale = locale || (typeof navigator !== "undefined" ? navigator.language : "ar-SA");

  try {
    const rtf = new Intl.RelativeTimeFormat(resolvedLocale, { numeric: "auto" });

    if (Math.abs(diffSecs) < 60) {
      return rtf.format(diffSecs, "second");
    } else if (Math.abs(diffMins) < 60) {
      return rtf.format(diffMins, "minute");
    } else if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, "hour");
    } else if (Math.abs(diffDays) < 30) {
      return rtf.format(diffDays, "day");
    } else {
      return formatDate(date, "medium", resolvedLocale);
    }
  } catch {
    return date.toISOString();
  }
}

export const formatCurrency = formatCurrencyDisplay;

/**
 * Format number with proper locale handling.
 *
 * @param value - Numeric value
 * @param locale - Optional locale override
 */
export function formatNumber(value: number, locale?: string): string {
  const resolvedLocale = locale || (typeof navigator !== "undefined" ? navigator.language : "ar-SA");

  try {
    return new Intl.NumberFormat(resolvedLocale).format(value);
  } catch {
    return value.toLocaleString();
  }
}
