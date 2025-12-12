// Unified currency formatting utilities for consistent multi-currency handling
import { CURRENCY_MAP, DEFAULT_CURRENCY, type CurrencyCode } from "@/config/currencies";
import {
  formatCurrency as formatDisplayCurrency,
  getCurrencyInfo,
} from "@/lib/currency-formatter";
import { logger } from "@/lib/logger";
import { parseCartAmount, parseCartAmountOrThrow } from "./parseCartAmount";

export type SupportedCurrency = CurrencyCode;

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  symbolPosition: "before" | "after";
  locale: string;
  decimalDigits: number;
  thousandSeparator: string;
  decimalSeparator: string;
}

// Currency configurations for consistent formatting derived from central config
export const CURRENCY_CONFIGS: Record<SupportedCurrency, CurrencyConfig> =
  Object.entries(CURRENCY_MAP).reduce(
    (acc, [code, currency]) => {
      const currencyCode = code as SupportedCurrency;
      acc[currencyCode] = {
        code: currencyCode,
        symbol: currency.symbol,
        symbolPosition: currency.symbolPosition ?? "after",
        locale: currency.locale,
        decimalDigits: currency.decimals ?? 2,
        thousandSeparator: currency.thousandSeparator ?? ",",
        decimalSeparator: currency.decimalSeparator ?? ".",
      };
      return acc;
    },
    {} as Record<SupportedCurrency, CurrencyConfig>,
  );

/**
 * Unified currency formatter that handles both USD and AED consistently
 */
export function formatCurrency(
  amount: unknown,
  currency: SupportedCurrency = DEFAULT_CURRENCY,
  options: {
    showSymbol?: boolean;
    compact?: boolean;
    fallback?: string;
  } = {},
): string {
  const { showSymbol = true, compact = false, fallback = "0.00" } = options;

  const parsedAmount = parseCartAmount(amount, 0);

  if (!Number.isFinite(parsedAmount)) {
    return fallback;
  }

  const formatted = formatDisplayCurrency(parsedAmount, {
    currency,
    showSymbol,
    compact,
    decimals: CURRENCY_CONFIGS[currency]?.decimalDigits,
  });

  return formatted || fallback;
}

/**
 * Parse and format currency in one step
 */
export function parseAndFormatCurrency(
  value: unknown,
  currency: SupportedCurrency = "USD",
  options?: Parameters<typeof formatCurrency>[2],
): string {
  return formatCurrency(value, currency, options);
}

/**
 * Convert between currencies (requires exchange rates)
 */
export function convertCurrency(
  amount: unknown,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
  exchangeRates?: Record<string, number>,
): number {
  const parsedAmount = parseCartAmount(amount, 0);

  if (!Number.isFinite(parsedAmount) || fromCurrency === toCurrency) {
    return parsedAmount;
  }

  // Default exchange rates (these should come from an API in production)
  const defaultRates: Record<string, number> = {
    "USD-AED": 3.6725,
    "AED-USD": 1 / 3.6725,
    "USD-SAR": 3.75,
    "SAR-USD": 1 / 3.75,
    "USD-EUR": 0.85,
    "EUR-USD": 1 / 0.85,
    "USD-GBP": 0.73,
    "GBP-USD": 1 / 0.73,
    "AED-SAR": 1.02,
    "SAR-AED": 1 / 1.02,
  };

  const rates = { ...defaultRates, ...exchangeRates };
  const rateKey = `${fromCurrency}-${toCurrency}`;
  const rate = rates[rateKey];

  if (!rate) {
    // Try reverse conversion
    const reverseKey = `${toCurrency}-${fromCurrency}`;
    const reverseRate = rates[reverseKey];
    if (reverseRate) {
      return parsedAmount / reverseRate;
    }

    // No conversion available, return original amount
    logger.warn(
      `No exchange rate available for ${fromCurrency} to ${toCurrency}`,
    );
    return parsedAmount;
  }

  return parsedAmount * rate;
}

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: SupportedCurrency): string {
  return getCurrencyInfo(currency).symbol || "$";
}

/**
 * Check if a currency uses RTL (right-to-left) display
 */
export function isCurrencyRTL(currency: SupportedCurrency): boolean {
  const locale = CURRENCY_CONFIGS[currency]?.locale || "";
  return locale.startsWith("ar");
}

/**
 * Validate currency amount with proper error handling
 */
export function validateCurrencyAmount(
  value: unknown,
  currency: SupportedCurrency = "USD",
  options: {
    min?: number;
    max?: number;
    required?: boolean;
  } = {},
): { isValid: boolean; value?: number; error?: string } {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, required = false } = options;

  if (value === null || value === undefined || value === "") {
    if (required) {
      return { isValid: false, error: `Amount is required` };
    }
    return { isValid: true, value: 0 };
  }

  try {
    const parsed = parseCartAmountOrThrow(
      value,
      `Invalid ${currency} amount format`,
    );

    if (parsed < min) {
      return {
        isValid: false,
        error: `Amount must be at least ${formatCurrency(min, currency)}`,
      };
    }

    if (parsed > max) {
      return {
        isValid: false,
        error: `Amount cannot exceed ${formatCurrency(max, currency)}`,
      };
    }

    return { isValid: true, value: parsed };
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Invalid amount format",
    };
  }
}

// Re-export parseCartAmount utilities for convenience
export { parseCartAmount, parseCartAmountOrThrow };

// Default export for unified payments utilities
const currencyUtils = {
  formatCurrency,
  parseAndFormatCurrency,
  convertCurrency,
  getCurrencySymbol,
  isCurrencyRTL,
  validateCurrencyAmount,
  parseCartAmount,
  parseCartAmountOrThrow,
  CURRENCY_CONFIGS,
};

export default currencyUtils;
