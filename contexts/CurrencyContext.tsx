'use client';
import { logger } from '@/lib/logger';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type CurrencyCode = 'SAR' | 'USD' | 'EUR' | 'GBP' | 'AED';

export type CurrencyOption = {
  code: CurrencyCode;
  name: string;
  symbol: string;
  flag: string;
};

export const CURRENCY_OPTIONS = [
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'Pound Sterling', symbol: '£', flag: '🇬🇧' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' }
] as const satisfies readonly CurrencyOption[];

const DEFAULT_CURRENCY: CurrencyCode = 'SAR';

interface CurrencyContextType {
  currency: CurrencyCode;
  // eslint-disable-next-line no-unused-vars
  setCurrency: (currency: CurrencyCode) => void;
  options: readonly CurrencyOption[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

/**
 * Provides application-wide currency state and persistence to descendants.
 *
 * The provider supplies a memoized context value with the current `currency`, a `setCurrency` setter, and the list of supported `options`.
 * On mount (client-side only) it attempts to initialize the currency from localStorage key `fixzit-currency` if the stored code matches a supported option.
 * Whenever the currency changes (client-side only) it persists the choice to localStorage (`fixzit-currency`), updates the document `data-currency` attribute, sets a `fxz.currency` cookie, and dispatches a `CustomEvent` named `fixzit:currency-change` with `{ currency }` in `detail`.
 *
 * The exposed `setCurrency` validates the provided code against the known options and falls back to the default currency when the code is not recognized.
 */
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
      logger.warn('Could not hydrate currency preference', { error });
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
      const secureAttr = (typeof window !== 'undefined' && typeof window.location !== 'undefined' && window.location.protocol === 'https:') ? '; Secure' : '';
      const maxAge = 31536000; // 1 year
      const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
      document.cookie = `fxz.currency=${encodeURIComponent(currency)}; Path=/; SameSite=Strict; Max-Age=${maxAge}; Expires=${expires}${secureAttr}`;
      window.dispatchEvent(
        new CustomEvent('fixzit:currency-change', {
          detail: { currency }
        })
      );
    } catch (error) {
      logger.warn('Could not persist currency preference', { error });
    }
  }, [currency]);

  const setCurrency = (next: CurrencyCode) => {
    if (!CURRENCY_OPTIONS.some(item => item.code === next)) return;
    setCurrencyState(next);
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

/**
 * Hook to access the current currency context.
 *
 * Returns the context value provided by CurrencyProvider: an object with
 * `currency` (current CurrencyCode), `setCurrency` (updater), and `options`
 * (available CurrencyOption[]). If called outside a provider, returns a safe
 * fallback using DEFAULT_CURRENCY, a no-op `setCurrency`, and CURRENCY_OPTIONS.
 *
 * @returns The currency context or a fallback object when no provider is present.
 */
export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('useCurrency called outside CurrencyProvider. Using fallback values.');
    }
    return {
      currency: DEFAULT_CURRENCY,
      setCurrency: () => {
        if (process.env.NODE_ENV === 'development') {
          logger.warn('setCurrency called outside CurrencyProvider. No-op.');
        }
      },
      options: CURRENCY_OPTIONS
    } as CurrencyContextType;
  }
  return context;
}
