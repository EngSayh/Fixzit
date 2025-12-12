import {
  CURRENCIES as CURRENCY_LIST,
  DEFAULT_CURRENCY,
  type Currency,
  type CurrencyCode,
} from "@/config/currencies";
import { getCurrency } from "@/lib/config/tenant";

export interface CurrencyFormatOptions {
  currency?: string;
  locale?: string;
  showSymbol?: boolean;
  decimals?: number;
  compact?: boolean;
  orgId?: string;
}

export interface CurrencyInfo extends Currency {
  decimals: number;
  symbolPosition: "before" | "after";
  thousandSeparator: string;
  decimalSeparator: string;
}

const currencyInfoMap: Record<CurrencyCode, CurrencyInfo> = Object.fromEntries(
  CURRENCY_LIST.map((currency) => [
    currency.code,
    {
      ...currency,
      decimals: currency.decimals ?? 2,
      symbolPosition: currency.symbolPosition ?? "after",
      thousandSeparator: currency.thousandSeparator ?? ",",
      decimalSeparator: currency.decimalSeparator ?? ".",
    },
  ]),
) as Record<CurrencyCode, CurrencyInfo>;

function resolveCurrency(code?: string, orgId?: string): CurrencyCode {
  const candidate =
    code ||
    (orgId ? (getCurrency(orgId) as string | undefined) : undefined) ||
    DEFAULT_CURRENCY;

  const normalized = candidate.toUpperCase() as CurrencyCode;
  return normalized in currencyInfoMap ? normalized : DEFAULT_CURRENCY;
}

function resolveLocale(currency: CurrencyCode, requested?: string): string {
  if (requested) return requested;
  return currencyInfoMap[currency]?.locale || currencyInfoMap[DEFAULT_CURRENCY].locale;
}

export function getCurrencyInfo(code: string): CurrencyInfo {
  const currency = resolveCurrency(code);
  return currencyInfoMap[currency];
}

export function formatCurrency(
  amount: number | string | null | undefined,
  options: CurrencyFormatOptions = {},
): string {
  if (amount === null || amount === undefined) {
    return formatCurrency(0, options);
  }

  const numericValue =
    typeof amount === "string" ? Number.parseFloat(amount) : amount;

  if (!Number.isFinite(numericValue)) {
    return formatCurrency(0, options);
  }

  const currency = resolveCurrency(options.currency, options.orgId);
  const info = currencyInfoMap[currency];
  const locale = resolveLocale(currency, options.locale);
  const decimals = options.decimals ?? info.decimals;
  const showSymbol = options.showSymbol ?? true;

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: showSymbol ? "currency" : "decimal",
      currency: showSymbol ? currency : undefined,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      notation: options.compact ? "compact" : "standard",
      compactDisplay: options.compact ? "short" : undefined,
    });

    return formatter.format(numericValue);
  } catch {
    const formatted = numericValue
      .toFixed(decimals)
      .replace(
        /\B(?=(\d{3})+(?!\d))/g,
        info.thousandSeparator ?? currencyInfoMap[DEFAULT_CURRENCY].thousandSeparator,
      )
      .replace(".", info.decimalSeparator ?? ".");

    if (!showSymbol) return formatted;

    return info.symbolPosition === "before"
      ? `${info.symbol}${formatted}`
      : `${formatted} ${info.symbol}`;
  }
}

export function formatCurrencyAr(
  amount: number | string | null | undefined,
  currency?: string,
): string {
  return formatCurrency(amount, {
    currency,
    locale: "ar-SA",
    showSymbol: true,
  });
}

export function formatCurrencyEn(
  amount: number | string | null | undefined,
  currency?: string,
): string {
  return formatCurrency(amount, {
    currency,
    locale: "en-SA",
    showSymbol: true,
  });
}

/**
 * Format a price range (min-max) with currency
 */
export function formatPriceRange(
  min: number,
  max: number,
  options: CurrencyFormatOptions = {},
): string {
  const formattedMin = formatCurrency(min, options);
  const formattedMax = formatCurrency(max, options);
  return `${formattedMin} - ${formattedMax}`;
}

/**
 * Parse a formatted currency string back to a number
 */
export function parseCurrency(value: string): number {
  if (!value || typeof value !== "string") {
    return NaN;
  }
  // Remove currency symbols, spaces, and common separators
  const cleaned = value
    .replace(/[^\d.,-]/g, "") // Remove all non-numeric except ., - and ,
    .replace(/,/g, ""); // Remove thousand separators
  return parseFloat(cleaned);
}

/**
 * Get list of all supported currency codes
 */
export function getSupportedCurrencies(): CurrencyCode[] {
  return Object.keys(currencyInfoMap) as CurrencyCode[];
}

/**
 * Check if a currency code is supported
 */
export function isSupportedCurrency(code: string): boolean {
  if (!code || typeof code !== "string") {
    return false;
  }
  const normalized = code.toUpperCase() as CurrencyCode;
  return normalized in currencyInfoMap;
}

export const CURRENCIES = currencyInfoMap;
export const SUPPORTED_CURRENCIES = Object.keys(currencyInfoMap) as CurrencyCode[];

export default {
  formatCurrency,
  formatCurrencyAr,
  formatCurrencyEn,
  formatPriceRange,
  parseCurrency,
  getSupportedCurrencies,
  isSupportedCurrency,
  CURRENCIES,
  SUPPORTED_CURRENCIES,
  getCurrencyInfo,
};
