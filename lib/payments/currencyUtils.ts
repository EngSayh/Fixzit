// Unified currency formatting utilities for consistent USD/AED handling
import { logger } from "@/lib/logger";
// Consolidates payment parsing logic across the application

import { parseCartAmount, parseCartAmountOrThrow } from "./parseCartAmount";

export type SupportedCurrency = "USD" | "AED" | "SAR" | "EUR" | "GBP";

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  symbolPosition: "before" | "after";
  locale: string;
  decimalDigits: number;
  thousandSeparator: string;
  decimalSeparator: string;
}

// Currency configurations for consistent formatting
export const CURRENCY_CONFIGS: Record<SupportedCurrency, CurrencyConfig> = {
  USD: {
    code: "USD",
    symbol: "$",
    symbolPosition: "before",
    locale: "en-US",
    decimalDigits: 2,
    thousandSeparator: ",",
    decimalSeparator: ".",
  },
  AED: {
    code: "AED",
    symbol: "د.إ",
    symbolPosition: "after",
    locale: "ar-AE",
    decimalDigits: 2,
    thousandSeparator: ",",
    decimalSeparator: ".",
  },
  SAR: {
    code: "SAR",
    symbol: "ر.س",
    symbolPosition: "after",
    locale: "ar-SA",
    decimalDigits: 2,
    thousandSeparator: ",",
    decimalSeparator: ".",
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    symbolPosition: "after",
    locale: "de-DE",
    decimalDigits: 2,
    thousandSeparator: ".",
    decimalSeparator: ",",
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    symbolPosition: "before",
    locale: "en-GB",
    decimalDigits: 2,
    thousandSeparator: ",",
    decimalSeparator: ".",
  },
};

/**
 * Unified currency formatter that handles both USD and AED consistently
 */
export function formatCurrency(
  amount: unknown,
  currency: SupportedCurrency = "USD",
  options: {
    showSymbol?: boolean;
    compact?: boolean;
    fallback?: string;
  } = {},
): string {
  const { showSymbol = true, compact = false, fallback = "0.00" } = options;

  // Parse the amount using our unified parser
  const parsedAmount = parseCartAmount(amount, 0);

  if (!Number.isFinite(parsedAmount)) {
    return fallback;
  }

  const config = CURRENCY_CONFIGS[currency];
  if (!config) {
    // Fallback to USD if currency not supported
    return formatCurrency(amount, "USD", options);
  }

  try {
    // Use Intl.NumberFormat for proper locale formatting
    const numberFormat = new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.code,
      minimumFractionDigits: compact ? 0 : config.decimalDigits,
      maximumFractionDigits: config.decimalDigits,
      ...(compact && parsedAmount >= 1000
        ? {
            notation: "compact",
            compactDisplay: "short",
          }
        : {}),
    });

    let formatted = numberFormat.format(parsedAmount);

    // Handle symbol display preference
    if (!showSymbol) {
      formatted = formatted.replace(config.symbol, "").trim();
    }

    return formatted;
  } catch {
    // Fallback to manual formatting if Intl fails
    const formattedNumber = parsedAmount.toFixed(config.decimalDigits);
    const parts = formattedNumber.split(".");

    // Add thousand separators
    parts[0] = parts[0].replace(
      /\B(?=(\d{3})+(?!\d))/g,
      config.thousandSeparator,
    );

    const number = parts.join(config.decimalSeparator);

    if (!showSymbol) {
      return number;
    }

    return config.symbolPosition === "before"
      ? `${config.symbol} ${number}`
      : `${number} ${config.symbol}`;
  }
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
  return CURRENCY_CONFIGS[currency]?.symbol || "$";
}

/**
 * Check if a currency uses RTL (right-to-left) display
 */
export function isCurrencyRTL(currency: SupportedCurrency): boolean {
  const rtlCurrencies: SupportedCurrency[] = ["AED", "SAR"];
  return rtlCurrencies.includes(currency);
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
