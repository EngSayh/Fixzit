import { logger } from "@/lib/logger";
import type { Locale } from "@/i18n/config";
export { formatCurrency } from "@/lib/payments/currencyUtils";

// Cache Intl formatters to avoid repeated allocations
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

export const fmtDate = (
  input: Date | number | string | null | undefined,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string => {
  try {
    if (input == null) {
      return "Invalid Date";
    }

    const date =
      typeof input === "string" || typeof input === "number"
        ? new Date(input)
        : input;

    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    return getDateFormatter(locale, options).format(date);
  } catch (error) {
    logger.error("Date formatting error:", error as Error, {
      label: "input:",
      input,
    });
    return "Invalid Date";
  }
};

export const sanitizePhoneNumber = (
  phone: string | null | undefined,
): string => {
  if (!phone) return "";
  const hasPlus = phone.trim().startsWith("+");
  const digitsOnly = phone.replace(/\D/g, "");
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
};

export const formatNumber = (
  num: number,
  options?: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    round?: boolean;
  },
): string => {
  const {
    locale = "en-SA",
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
    round = true,
  } = options || {};

  const value = round ? Math.round(num) : num;

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
};
