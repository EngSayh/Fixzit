'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

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
  const hydratedRef = useRef(false);
  const skipNextPersistRef = useRef(false);

  // Hydrate from DOM attribute -> localStorage -> cookie once on mount
  useEffect(() => {
    try {
      const fromAttr = document.documentElement.getAttribute('data-currency') as CurrencyCode | null;
      if (fromAttr && CURRENCY_OPTIONS.some(o => o.code === fromAttr)) {
        skipNextPersistRef.current = true;
        setCurrencyState(prev => (prev !== fromAttr ? fromAttr : prev));
      } else {
        const fromLS = window.localStorage.getItem('fixzit-currency') as CurrencyCode | null;
        if (fromLS && CURRENCY_OPTIONS.some(o => o.code === fromLS)) {
          skipNextPersistRef.current = true;
          setCurrencyState(prev => (prev !== fromLS ? fromLS : prev));
        } else {
          const match = document.cookie.match(/(?:^|;\s*)fxz\.currency=([^;]+)/);
          const fromCookie = (match && match[1]) as CurrencyCode | undefined;
          if (fromCookie && CURRENCY_OPTIONS.some(o => o.code === fromCookie)) {
            skipNextPersistRef.current = true;
            setCurrencyState(prev => (prev !== fromCookie ? fromCookie : prev));
          }
        }
      }
    } catch (error) {
      console.warn('Could not hydrate currency preference:', error);
    } finally {
      hydratedRef.current = true;
    }
  }, []);

  // Cross-tab sync for currency updates written to localStorage
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'fixzit-currency' && typeof e.newValue === 'string') {
        const next = e.newValue as CurrencyCode;
        if (CURRENCY_OPTIONS.some(o => o.code === next)) {
          setCurrencyState(prev => (prev !== next ? next : prev));
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Persist only after hydration
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    try {
      window.localStorage.setItem('fixzit-currency', currency);
      document.documentElement.setAttribute('data-currency', currency);
      const secureAttr = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `fxz.currency=${currency}; Path=/; SameSite=Strict; Max-Age=31536000${secureAttr}`;
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
    if (process.env.NODE_ENV === 'development') {
      console.warn('useCurrency called outside CurrencyProvider. Using fallback values.');
    }
    return {
      currency: DEFAULT_CURRENCY,
      setCurrency: () => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('setCurrency called outside CurrencyProvider. No-op.');
        }
      },
      options: CURRENCY_OPTIONS
    } as CurrencyContextType;
  }
  return context;
}
