/**
 * Currency Formatter Utility
 *
 * Provides consistent currency formatting across the application.
 * Supports multi-currency and localization.
 *
 * @module lib/utils/currency-formatter
 */

import { getCurrency } from "../config/tenant";

/**
 * Currency formatting options
 */
export interface CurrencyFormatOptions {
  /** Currency code (ISO 4217). Defaults to organization currency. */
  currency?: string;
  /** Locale for formatting. Defaults to 'ar-SA' for Arabic or 'en-SA' for English. */
  locale?: string;
  /** Whether to show the currency symbol/code */
  showSymbol?: boolean;
  /** Number of decimal places. Defaults to 2. */
  decimals?: number;
  /** Whether to use compact notation for large numbers */
  compact?: boolean;
  /** Organization ID for tenant-specific settings */
  orgId?: string;
}

/**
 * Currency information
 */
interface CurrencyInfo {
  code: string;
  symbol: string;
  nameEn: string;
  nameAr: string;
  decimals: number;
}

/**
 * Supported currencies with their information
 */
export const CURRENCIES: Record<string, CurrencyInfo> = {
  SAR: {
    code: "SAR",
    symbol: "﷼",
    nameEn: "Saudi Riyal",
    nameAr: "ريال سعودي",
    decimals: 2,
  },
  AED: {
    code: "AED",
    symbol: "د.إ",
    nameEn: "UAE Dirham",
    nameAr: "درهم إماراتي",
    decimals: 2,
  },
  USD: {
    code: "USD",
    symbol: "$",
    nameEn: "US Dollar",
    nameAr: "دولار أمريكي",
    decimals: 2,
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    nameEn: "Euro",
    nameAr: "يورو",
    decimals: 2,
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    nameEn: "British Pound",
    nameAr: "جنيه إسترليني",
    decimals: 2,
  },
  OMR: {
    code: "OMR",
    symbol: "ر.ع.",
    nameEn: "Omani Rial",
    nameAr: "ريال عماني",
    decimals: 3,
  },
  KWD: {
    code: "KWD",
    symbol: "د.ك",
    nameEn: "Kuwaiti Dinar",
    nameAr: "دينار كويتي",
    decimals: 3,
  },
  BHD: {
    code: "BHD",
    symbol: "د.ب",
    nameEn: "Bahraini Dinar",
    nameAr: "دينار بحريني",
    decimals: 3,
  },
  QAR: {
    code: "QAR",
    symbol: "ر.ق",
    nameEn: "Qatari Riyal",
    nameAr: "ريال قطري",
    decimals: 2,
  },
  EGP: {
    code: "EGP",
    symbol: "ج.م",
    nameEn: "Egyptian Pound",
    nameAr: "جنيه مصري",
    decimals: 2,
  },
};

/**
 * Get the default locale based on currency
 */
function getDefaultLocale(currency: string): string {
  const localeMap: Record<string, string> = {
    SAR: "ar-SA",
    AED: "ar-AE",
    OMR: "ar-OM",
    KWD: "ar-KW",
    BHD: "ar-BH",
    QAR: "ar-QA",
    EGP: "ar-EG",
    USD: "en-US",
    EUR: "en-EU",
    GBP: "en-GB",
  };
  return localeMap[currency] || "ar-SA";
}

/**
 * Format a number as currency
 *
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string
 *
 * @example
 * ```ts
 * formatCurrency(1234.56); // "1,234.56 SAR"
 * formatCurrency(1234.56, { currency: "USD" }); // "$1,234.56"
 * formatCurrency(1000000, { compact: true }); // "1M SAR"
 * ```
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  options: CurrencyFormatOptions = {}
): string {
  // Handle null/undefined
  if (amount === null || amount === undefined) {
    return formatCurrency(0, options);
  }

  // Convert string to number
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  // Handle NaN
  if (isNaN(numAmount)) {
    return formatCurrency(0, options);
  }

  const {
    currency = getCurrency(options.orgId),
    locale = getDefaultLocale(currency),
    showSymbol = true,
    decimals,
    compact = false,
  } = options;

  const currencyInfo = CURRENCIES[currency] || CURRENCIES.SAR;
  const fractionDigits = decimals ?? currencyInfo.decimals;

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: showSymbol ? "currency" : "decimal",
      currency: showSymbol ? currency : undefined,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      notation: compact ? "compact" : "standard",
      compactDisplay: compact ? "short" : undefined,
    });

    return formatter.format(numAmount);
  } catch {
    // Fallback for unsupported locales
    const formatted = numAmount.toFixed(fractionDigits);
    return showSymbol ? `${formatted} ${currency}` : formatted;
  }
}

/**
 * Format currency with Arabic locale
 *
 * @param amount - The amount to format
 * @param currency - Currency code (defaults to organization currency)
 * @returns Formatted currency string in Arabic
 *
 * @example
 * ```ts
 * formatCurrencyAr(1234.56); // "١٬٢٣٤٫٥٦ ر.س."
 * ```
 */
export function formatCurrencyAr(
  amount: number | string | null | undefined,
  currency?: string
): string {
  return formatCurrency(amount, {
    currency,
    locale: "ar-SA",
    showSymbol: true,
  });
}

/**
 * Format currency with English locale
 *
 * @param amount - The amount to format
 * @param currency - Currency code (defaults to organization currency)
 * @returns Formatted currency string in English
 *
 * @example
 * ```ts
 * formatCurrencyEn(1234.56); // "SAR 1,234.56"
 * ```
 */
export function formatCurrencyEn(
  amount: number | string | null | undefined,
  currency?: string
): string {
  return formatCurrency(amount, {
    currency,
    locale: "en-SA",
    showSymbol: true,
  });
}

/**
 * Format a price range
 *
 * @param min - Minimum price
 * @param max - Maximum price
 * @param options - Formatting options
 * @returns Formatted price range string
 *
 * @example
 * ```ts
 * formatPriceRange(1000, 5000); // "SAR 1,000 - SAR 5,000"
 * formatPriceRange(1000, 5000, { currency: "USD" }); // "$1,000 - $5,000"
 * ```
 */
export function formatPriceRange(
  min: number,
  max: number,
  options: CurrencyFormatOptions = {}
): string {
  const minFormatted = formatCurrency(min, options);
  const maxFormatted = formatCurrency(max, options);
  return `${minFormatted} - ${maxFormatted}`;
}

/**
 * Parse a formatted currency string to a number
 *
 * @param value - Formatted currency string
 * @returns Parsed number or NaN if invalid
 *
 * @example
 * ```ts
 * parseCurrency("SAR 1,234.56"); // 1234.56
 * parseCurrency("1,234.56"); // 1234.56
 * ```
 */
export function parseCurrency(value: string): number {
  if (!value) return NaN;

  // Remove currency symbols, codes, and whitespace
  const cleaned = value
    .replace(/[^\d.,-]/g, "") // Remove non-numeric except . , -
    .replace(/,/g, ""); // Remove commas

  return parseFloat(cleaned);
}

/**
 * Convert amount between currencies (placeholder for future API integration)
 *
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Converted amount (currently returns same amount as placeholder)
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  // TODO: Implement actual currency conversion using exchange rate API
  // For now, return the same amount (single-currency system)
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // eslint-disable-next-line no-console -- Intentional warning for unimplemented feature
  console.warn(
    `Currency conversion from ${fromCurrency} to ${toCurrency} not yet implemented. Returning original amount.`
  );
  return amount;
}

/**
 * Get currency information
 *
 * @param code - Currency code (ISO 4217)
 * @returns Currency information or undefined if not found
 */
export function getCurrencyInfo(code: string): CurrencyInfo | undefined {
  return CURRENCIES[code.toUpperCase()];
}

/**
 * Get all supported currencies
 *
 * @returns Array of supported currency codes
 */
export function getSupportedCurrencies(): string[] {
  return Object.keys(CURRENCIES);
}

/**
 * Check if a currency is supported
 *
 * @param code - Currency code to check
 * @returns Whether the currency is supported
 */
export function isSupportedCurrency(code: string): boolean {
  return code.toUpperCase() in CURRENCIES;
}

export default {
  formatCurrency,
  formatCurrencyAr,
  formatCurrencyEn,
  formatPriceRange,
  parseCurrency,
  convertCurrency,
  getCurrencyInfo,
  getSupportedCurrencies,
  isSupportedCurrency,
  CURRENCIES,
};
