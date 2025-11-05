/**
 * Utility functions for formatting data across the application
 */

/**
 * Sanitizes a phone number string by removing all non-digit characters.
 * Suitable for use in wa.me links and standardized tel: links.
 * @param phone The phone number string
 * @returns The sanitized phone number (digits only) or an empty string if input is null/undefined
 * @example
 * sanitizePhoneNumber('+966 (55) 123-4567') // Returns: '966551234567'
 * sanitizePhoneNumber('+1 (555) 123-4567') // Returns: '15551234567'
 */
export const sanitizePhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return '';
  // Remove all non-digit characters
  return phone.replace(/\D/g, '');
};

/**
 * Formats a number as currency using the specified currency code.
 * Defaults to SAR with no decimals.
 * @param amount The amount to format
 * @param currency The currency code (default: SAR)
 * @param minimumFractionDigits Minimum decimal places (default: 0)
 * @param maximumFractionDigits Maximum decimal places (default: 0)
 * @returns Formatted currency string
 * @example
 * formatCurrency(1234567.89) // Returns: 'SAR 1,234,568'
 * formatCurrency(1000, 'USD', 2, 2) // Returns: '$1,000.00'
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'SAR',
  minimumFractionDigits = 0,
  maximumFractionDigits = 0
): string => {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
};

/**
 * Formats a number using standard grouping separators.
 * @param num The number to format
 * @returns Formatted number string with thousand separators
 * @example
 * formatNumber(12345) // Returns: '12,345'
 * formatNumber(1234567.89) // Returns: '1,234,568'
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-SA').format(Math.round(num));
};
