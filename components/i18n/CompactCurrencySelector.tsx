'use client';

import { DollarSign } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

// Simplified currency options for auth pages
const AUTH_CURRENCIES = [
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
];

interface CompactCurrencySelectorProps {
  className?: string;
}

/**
 * Simplified currency selector for authentication pages.
 * Shows only 2-3 common currencies in a simple dropdown.
 */
export default function CompactCurrencySelector({ className = '' }: CompactCurrencySelectorProps) {
  const { currency, setCurrency } = useCurrency();

  const handleChange = (newCurrency: string) => {
    // Update currency in context (cast to expected type)
    if (setCurrency) {
      setCurrency(newCurrency as any);
    }

    // Persist to localStorage as fallback
    try {
      localStorage.setItem('fixzit-currency', newCurrency);
    } catch (err) {
      console.error('Failed to save currency preference:', err);
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200 hover:border-gray-300 transition-colors">
        <DollarSign className="h-4 w-4 text-gray-600" />
        <select
          value={currency}
          onChange={(e) => handleChange(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-gray-700 font-medium cursor-pointer pr-1"
          aria-label="Select currency"
        >
          {AUTH_CURRENCIES.map((curr) => (
            <option key={curr.code} value={curr.code}>
              {curr.symbol} {curr.code}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
