import { parseCartAmount as parsePaymentCartAmount } from '@/src/lib/payments/parseCartAmount';

// Delegate cart amount parsing to the shared payments helper so PayTabs-specific
// callbacks and admin flows stay in sync on acceptable formats.

export function normalizePaytabsString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const parseCartAmount = parsePaymentCartAmount;

export function normalizePaytabsStatus(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toUpperCase();
}
