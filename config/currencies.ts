/**
 * Currency Configuration
 * Single source of truth for supported currencies across the application
 */

export type CurrencyCode = "SAR" | "USD" | "EUR" | "GBP" | "AED";

export interface Currency {
  code: CurrencyCode;
  name: string;
  symbol: string;
  locale: string;
  flag: string;
}

/**
 * Supported currencies for the application
 * KSA-first policy: SAR is the default currency
 */
export const CURRENCIES: readonly Currency[] = [
  {
    code: "SAR",
    name: "Saudi Riyal",
    symbol: "ر.س",
    locale: "ar-SA",
    flag: "🇸🇦",
  },
  {
    code: "AED",
    name: "UAE Dirham",
    symbol: "د.إ",
    locale: "ar-AE",
    flag: "🇦🇪",
  },
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    locale: "en-US",
    flag: "🇺🇸",
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    locale: "de-DE",
    flag: "🇪🇺",
  },
  {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    locale: "en-GB",
    flag: "🇬🇧",
  },
] as const;

/**
 * Default currency (KSA-first policy)
 */
export const DEFAULT_CURRENCY: CurrencyCode = "SAR";

/**
 * Get default currency (SAR for KSA-first)
 */
export function getDefaultCurrency(): Currency {
  const preferred = CURRENCIES.find((c) => c.code === "SAR");
  if (preferred) return preferred;

  const fallback = CURRENCIES[0];
  if (!fallback) {
    throw new Error(
      "No currencies configured. Ensure CURRENCIES is non-empty.",
    );
  }
  return fallback;
}

/**
 * Get currency configuration by code
 */
export function getCurrencyByCode(code: string): Currency | undefined {
  return CURRENCIES.find((curr) => curr.code === code);
}

/**
 * Validate if a currency code is supported
 */
export function isValidCurrencyCode(code: string): code is CurrencyCode {
  return CURRENCIES.some((curr) => curr.code === code);
}

/**
 * Format currency amount
 */
export function formatCurrencyAmount(
  amount: number,
  currencyCode: CurrencyCode,
  locale?: string,
): string {
  const currency = getCurrencyByCode(currencyCode);
  if (!currency) {
    return `${amount} ${currencyCode}`;
  }

  try {
    return new Intl.NumberFormat(locale || currency.locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency.symbol}${amount}`;
  }
}
