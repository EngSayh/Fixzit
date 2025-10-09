import { parseCartAmount as parsePaymentCartAmount } from '@/lib/payments/parseCartAmount';

// Delegate cart amount parsing to the shared payments helper so PayTabs-specific
// callbacks and admin flows stay in sync on acceptable formats.

export const parseCartAmount = parsePaymentCartAmount;

export function normalizePaytabsString(value: any): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizePaytabsStatus(value: any): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toUpperCase();
}
