/**
 * Utility functions for formatting data across the application
 */

/**
 * Sanitizes a phone number string by removing all non-digit characters except leading '+'.
 * Preserves the international dialing prefix for proper tel: URI formatting.
 * Suitable for use in wa.me links and tel: links that require E.164 format.
 * @param phone The phone number string
 * @returns The sanitized phone number (digits with optional leading +) or an empty string if input is null/undefined
 * @example
 * sanitizePhoneNumber('+966 (55) 123-4567') // Returns: '+966551234567'
 * sanitizePhoneNumber('+1 (555) 123-4567') // Returns: '+15551234567'
 * sanitizePhoneNumber('966 55 123 4567') // Returns: '966551234567'
 */
export const sanitizePhoneNumber = (
  phone: string | null | undefined,
): string => {
  if (!phone) return "";
  // Preserve leading '+' for international format, remove all other non-digits
  const hasPlus = phone.trim().startsWith("+");
  const digitsOnly = phone.replace(/\D/g, "");
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
};

/**
 * Re-export the comprehensive formatCurrency utility from lib/payments/currencyUtils.ts.
 * Provides robust currency formatting with proper locale support, error handling, and fallback mechanisms.
 *
 * @param amount The amount to format
 * @param currency The currency code (default: 'USD')
 * @param options Optional configuration:
 *   - showSymbol: boolean (default: true) - Whether to show currency symbol
 *   - compact: boolean (default: false) - Whether to use compact notation for large numbers
 *   - fallback: string (default: '0.00') - Fallback value for invalid amounts
 * @returns Formatted currency string
 * @example
 * formatCurrency(1234567.89, 'SAR') // Returns: '١٬٢٣٤٬٥٦٧٫٨٩ ر.س'
 * formatCurrency(1000, 'USD', { showSymbol: false }) // Returns: '1,000.00'
 * @see lib/payments/currencyUtils.ts for full documentation
 */
export { formatCurrency } from "../lib/payments/currencyUtils";

/**
 * Formats a number using standard grouping separators with enhanced options.
 * Consolidates formatting logic from MortgageCalculator and arabic-support.js.
 *
 * @param num The number to format
 * @param options Optional formatting options:
 *   - locale: string (default: 'en-SA') - The locale for number formatting
 *   - minimumFractionDigits: number (default: 0) - Minimum decimal places
 *   - maximumFractionDigits: number (default: 0) - Maximum decimal places
 *   - round: boolean (default: true) - Whether to round to nearest integer
 * @returns Formatted number string with thousand separators
 * @example
 * formatNumber(12345) // Returns: '12,345'
 * formatNumber(1234567.89) // Returns: '1,234,568'
 * formatNumber(1234567.89, { minimumFractionDigits: 2, maximumFractionDigits: 2, round: false }) // Returns: '1,234,567.89'
 * formatNumber(12345, { locale: 'ar-SA' }) // Returns: '١٢٬٣٤٥'
 */
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
