import { logger } from "@/lib/logger";
import type { Locale } from "@/i18n/config";

// 🚀 PERFORMANCE: Cache Intl formatters to avoid expensive re-creation on every call
const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function getNumberFormatter(locale: Locale): Intl.NumberFormat {
  const localeCode = locale === "ar" ? "ar-SA" : "en-GB";
  if (!numberFormatters.has(localeCode)) {
    numberFormatters.set(localeCode, new Intl.NumberFormat(localeCode));
  }
  return numberFormatters.get(localeCode)!;
}

function getDateFormatter(
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const localeCode = locale === "ar" ? "ar-SA" : "en-GB";
  const optionsKey = options ? JSON.stringify(options) : "default";
  const cacheKey = `${localeCode}:${optionsKey}`;

  if (!dateFormatters.has(cacheKey)) {
    dateFormatters.set(
      cacheKey,
      new Intl.DateTimeFormat(localeCode, options ?? { dateStyle: "medium" }),
    );
  }
  return dateFormatters.get(cacheKey)!;
}

export const fmtNumber = (value: number, locale: Locale) =>
  getNumberFormatter(locale).format(value);

/**
 * Format a date with crash protection for null/undefined/invalid inputs
 *
 * 🔒 SECURITY FIX: Added try/catch to prevent crashes on invalid date inputs
 * 🚀 PERFORMANCE FIX: Uses cached Intl.DateTimeFormat instances
 *
 * @param input - Date, timestamp, or date string (null/undefined returns 'Invalid Date')
 * @param locale - Locale for formatting ('ar' | 'en')
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted date string or 'Invalid Date' for invalid inputs
 */
export const fmtDate = (
  input: Date | number | string | null | undefined,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string => {
  try {
    // 🔒 FIX: Handle null/undefined explicitly
    if (input == null) {
      return "Invalid Date";
    }

    const date =
      typeof input === "string" || typeof input === "number"
        ? new Date(input)
        : input;

    // 🔒 FIX: Check if date is valid after construction
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    return getDateFormatter(locale, options).format(date);
  } catch (error) {
    // 🔒 FIX: Catch any unexpected formatting errors
    logger.error("Date formatting error:", error as Error, {
      label: "input:",
      input,
    });
    return "Invalid Date";
  }
};
