'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type CurrencyCode = 'SAR' | 'USD' | 'EUR' | 'GBP' | 'AED';

export type CurrencyOption = {
  code: CurrencyCode;
  name: string;
  symbol: string;
  flag: string;
};

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'Pound Sterling', symbol: '£', flag: '🇬🇧' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' }
];

const DEFAULT_CURRENCY: CurrencyCode = 'SAR';

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  options: CurrencyOption[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = window.localStorage.getItem('fixzit-currency') as CurrencyCode | null;
      if (stored && CURRENCY_OPTIONS.some(option => option.code === stored)) {
        setCurrencyState(stored);
      }
    } catch (error) {
      console.warn('Could not access localStorage for currency preference:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem('fixzit-currency', currency);
      document.documentElement.setAttribute('data-currency', currency);
      document.cookie = `fxz.currency=${currency}; path=/; SameSite=Lax`;
      window.dispatchEvent(
        new CustomEvent('fixzit:currency-change', {
          detail: { currency }
        })
      );
    } catch (error) {
      console.warn('Could not persist currency preference:', error);
    }
  }, [currency]);

  const setCurrency = (next: CurrencyCode) => {
    const option = CURRENCY_OPTIONS.find(item => item.code === next);
    setCurrencyState(option ? option.code : DEFAULT_CURRENCY);
  };

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      options: CURRENCY_OPTIONS
    }),
    [currency]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    const fallback: CurrencyContextType = {
      currency: DEFAULT_CURRENCY,
      setCurrency: () => undefined,
      options: CURRENCY_OPTIONS
    };
    return fallback;
  }
  return context;
}
