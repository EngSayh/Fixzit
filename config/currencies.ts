/**
 * Currency Configuration
 * Single source of truth for supported currencies across the application
 */

export type CurrencyCode =
  | "SAR"
  | "USD"
  | "EUR"
  | "GBP"
  | "AED"
  | "OMR"
  | "KWD"
  | "BHD"
  | "QAR"
  | "EGP";

export interface Currency {
  code: CurrencyCode;
  name: string;
  symbol: string;
  locale: string;
  flag: string;
  decimals?: number;
  symbolPosition?: "before" | "after";
  thousandSeparator?: string;
  decimalSeparator?: string;
  minorUnit?: string;
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
    decimals: 2,
    symbolPosition: "after",
    thousandSeparator: ",",
    decimalSeparator: ".",
    minorUnit: "halalas",
  },
  {
    code: "AED",
    name: "UAE Dirham",
    symbol: "د.إ",
    locale: "ar-AE",
    flag: "🇦🇪",
    decimals: 2,
    symbolPosition: "after",
    thousandSeparator: ",",
    decimalSeparator: ".",
    minorUnit: "fils",
  },
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    locale: "en-US",
    flag: "🇺🇸",
    decimals: 2,
    symbolPosition: "before",
    thousandSeparator: ",",
    decimalSeparator: ".",
    minorUnit: "cents",
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    locale: "de-DE",
    flag: "🇪🇺",
    decimals: 2,
    symbolPosition: "after",
    thousandSeparator: ".",
    decimalSeparator: ",",
    minorUnit: "cents",
  },
  {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    locale: "en-GB",
    flag: "🇬🇧",
    decimals: 2,
    symbolPosition: "before",
    thousandSeparator: ",",
    decimalSeparator: ".",
    minorUnit: "pence",
  },
  {
    code: "OMR",
    name: "Omani Rial",
    symbol: "ر.ع.",
    locale: "ar-OM",
    flag: "🇴🇲",
    decimals: 3,
    symbolPosition: "after",
    thousandSeparator: ",",
    decimalSeparator: ".",
    minorUnit: "baisa",
  },
  {
    code: "KWD",
    name: "Kuwaiti Dinar",
    symbol: "د.ك",
    locale: "ar-KW",
    flag: "🇰🇼",
    decimals: 3,
    symbolPosition: "after",
    thousandSeparator: ",",
    decimalSeparator: ".",
    minorUnit: "fils",
  },
  {
    code: "BHD",
    name: "Bahraini Dinar",
    symbol: "د.ب",
    locale: "ar-BH",
    flag: "🇧🇭",
    decimals: 3,
    symbolPosition: "after",
    thousandSeparator: ",",
    decimalSeparator: ".",
    minorUnit: "fils",
  },
  {
    code: "QAR",
    name: "Qatari Riyal",
    symbol: "ر.ق",
    locale: "ar-QA",
    flag: "🇶🇦",
    decimals: 2,
    symbolPosition: "after",
    thousandSeparator: ",",
    decimalSeparator: ".",
    minorUnit: "dirham",
  },
  {
    code: "EGP",
    name: "Egyptian Pound",
    symbol: "ج.م",
    locale: "ar-EG",
    flag: "🇪🇬",
    decimals: 2,
    symbolPosition: "before",
    thousandSeparator: ",",
    decimalSeparator: ".",
    minorUnit: "piastre",
  },
] as const;

/**
 * Default currency (KSA-first policy)
 */
export const DEFAULT_CURRENCY: CurrencyCode = "SAR";

/**
 * Quick lookup map for currency metadata keyed by code
 */
export const CURRENCY_MAP: Record<CurrencyCode, Currency> = CURRENCIES.reduce(
  (acc, currency) => {
    acc[currency.code] = currency;
    return acc;
  },
  {} as Record<CurrencyCode, Currency>,
);

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
