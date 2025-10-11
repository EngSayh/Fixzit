import { parseCartAmount as parsePaymentCartAmount } from '@/lib/payments/parseCartAmount';

/**
 * PayTabs Cart Amount Parser
 * 
 * Delegates to the shared payments helper to ensure PayTabs-specific callbacks
 * and admin flows stay in sync on acceptable cart amount formats.
 * 
 * Supports both string and numeric amounts, handles currency conversion.
 */
export const parseCartAmount = parsePaymentCartAmount;

/**
 * Normalize PayTabs String Values
 * 
 * Safely extracts and trims string values from PayTabs callback payloads.
 * Returns null for invalid inputs to make downstream validation explicit.
 * 
 * @param value - Raw value from PayTabs callback (unknown type)
 * @returns Trimmed non-empty string or null if invalid
 * 
 * @example
 * normalizePaytabsString('  123456  ') // Returns: '123456'
 * normalizePaytabsString('') // Returns: null
 * normalizePaytabsString(null) // Returns: null
 */
export function normalizePaytabsString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Normalize PayTabs Payment Status
 * 
 * Converts PayTabs status codes to uppercase for consistent comparison.
 * Status codes include: 'A' (Authorized), 'V' (Voided), 'D' (Declined), etc.
 * 
 * @param value - Raw status value from PayTabs callback
 * @returns Uppercase status string or empty string if invalid
 * 
 * @example
 * normalizePaytabsStatus('a') // Returns: 'A'
 * normalizePaytabsStatus('Authorized') // Returns: 'AUTHORIZED'
 * normalizePaytabsStatus(123) // Returns: ''
 */
export function normalizePaytabsStatus(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toUpperCase();
}
