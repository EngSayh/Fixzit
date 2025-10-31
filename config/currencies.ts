/**
 * Currency Configuration
 * 
 * ✅ SINGLE SOURCE OF TRUTH for all currency data
 * Used by: CurrencySelector, SignupPage, etc.
 */

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

/**
 * Get default currency (SAR for KSA-first)
 */
export function getDefaultCurrency(): Currency {
  return CURRENCIES.find(c => c.code === 'SAR') || CURRENCIES[0];
}
