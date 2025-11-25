/**
 * Currency utilities for Finance Pack
 * Handles conversion between major/minor units and foreign exchange
 */

export interface CurrencyConfig {
  code: string; // ISO 4217 (SAR, USD, EUR, etc.)
  name: string;
  symbol: string;
  decimalPlaces: number; // 2 for most currencies
  minorUnit: string; // "halalas" for SAR, "cents" for USD
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  SAR: {
    code: "SAR",
    name: "Saudi Riyal",
    symbol: "ر.س",
    decimalPlaces: 2,
    minorUnit: "halalas",
  },
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    decimalPlaces: 2,
    minorUnit: "cents",
  },
  EUR: {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    decimalPlaces: 2,
    minorUnit: "cents",
  },
  GBP: {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    decimalPlaces: 2,
    minorUnit: "pence",
  },
  AED: {
    code: "AED",
    name: "UAE Dirham",
    symbol: "د.إ",
    decimalPlaces: 2,
    minorUnit: "fils",
  },
};

/**
 * Convert from major units (e.g., 100.50 SAR) to minor units (e.g., 10050 halalas)
 * Uses integer arithmetic to avoid floating-point errors
 */
export function toMinor(amount: number, currency: string = "SAR"): number {
  const config = CURRENCIES[currency] || CURRENCIES.SAR;
  const multiplier = Math.pow(10, config.decimalPlaces);
  return Math.round(amount * multiplier);
}

/**
 * Convert from minor units (e.g., 10050 halalas) to major units (e.g., 100.50 SAR)
 */
export function fromMinor(amount: number, currency: string = "SAR"): number {
  const config = CURRENCIES[currency] || CURRENCIES.SAR;
  const divisor = Math.pow(10, config.decimalPlaces);
  return amount / divisor;
}

/**
 * Apply foreign exchange rate to convert between currencies
 * All amounts in minor units
 *
 * @param amount - Amount in source currency minor units
 * @param fxRate - Exchange rate (how much 1 unit of source = target)
 * @param sourceCurrency - Source currency code
 * @param targetCurrency - Target currency code
 * @returns Amount in target currency minor units
 *
 * @example
 * // Convert 100 SAR to USD at rate 0.2667
 * applyFx(10000, 0.2667, 'SAR', 'USD') // Returns 2667 (26.67 USD)
 */
export function applyFx(
  amount: number,
  fxRate: number,
  sourceCurrency: string = "SAR",
  targetCurrency: string = "SAR",
): number {
  if (sourceCurrency === targetCurrency) return amount;

  // Convert to major units, apply FX, convert back to minor units
  const majorAmount = fromMinor(amount, sourceCurrency);
  const convertedMajor = majorAmount * fxRate;
  return toMinor(convertedMajor, targetCurrency);
}

/**
 * Format amount for display
 *
 * @param amount - Amount in minor units
 * @param currency - Currency code
 * @param locale - Locale for formatting (default 'ar-SA' for Saudi Arabia)
 * @returns Formatted string with currency symbol
 */
export function formatCurrency(
  amount: number,
  currency: string = "SAR",
  locale: string = "ar-SA",
): string {
  const config = CURRENCIES[currency] || CURRENCIES.SAR;
  const majorAmount = fromMinor(amount, currency);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: config.code,
    minimumFractionDigits: config.decimalPlaces,
    maximumFractionDigits: config.decimalPlaces,
  }).format(majorAmount);
}

/**
 * Parse currency string to minor units
 * Handles various formats: "100.50", "100,50", "ر.س 100.50"
 */
export function parseCurrency(value: string, currency: string = "SAR"): number {
  // Remove currency symbols, whitespace, and convert commas to dots
  const cleaned = value.replace(/[^\d.,-]/g, "").replace(",", ".");

  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;

  return toMinor(parsed, currency);
}
