'use client&apos;;

import { createContext, useContext, useEffect, useMemo, useState } from &apos;react&apos;;

export type CurrencyCode = &apos;SAR&apos; | &apos;USD&apos; | &apos;EUR&apos; | &apos;GBP&apos; | &apos;AED&apos;;

export type CurrencyOption = {
  code: CurrencyCode;
  name: string;
  symbol: string;
  flag: string;
};

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: &apos;SAR&apos;, name: &apos;Saudi Riyal&apos;, symbol: &apos;﷼', flag: &apos;🇸🇦&apos; },
  { code: &apos;USD&apos;, name: &apos;US Dollar&apos;, symbol: &apos;$', flag: &apos;🇺🇸&apos; },
  { code: &apos;EUR&apos;, name: &apos;Euro&apos;, symbol: &apos;€', flag: &apos;🇪🇺&apos; },
  { code: &apos;GBP&apos;, name: &apos;Pound Sterling&apos;, symbol: &apos;£', flag: &apos;🇬🇧&apos; },
  { code: &apos;AED&apos;, name: &apos;UAE Dirham&apos;, symbol: &apos;د.إ&apos;, flag: &apos;🇦🇪&apos; }
];

const DEFAULT_CURRENCY: CurrencyCode = &apos;SAR&apos;;

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  options: CurrencyOption[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);

  useEffect(() => {
    if (typeof window === &apos;undefined&apos;) {
      return;
    }

    try {
      const stored = window.localStorage.getItem(&apos;fixzit-currency&apos;) as CurrencyCode | null;
      if (stored && CURRENCY_OPTIONS.some(option => option.code === stored)) {
        setCurrencyState(stored);
      }
    } catch (error) {
      console.warn(&apos;Could not access localStorage for currency preference:&apos;, error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === &apos;undefined&apos;) {
      return;
    }

    try {
      window.localStorage.setItem(&apos;fixzit-currency&apos;, currency);
      document.documentElement.setAttribute(&apos;data-currency&apos;, currency);
      document.cookie = `fxz.currency=${currency}; path=/; SameSite=Lax`;
      window.dispatchEvent(
        new CustomEvent(&apos;fixzit:currency-change&apos;, {
          detail: { currency }
        })
      );
    } catch (error) {
      console.warn(&apos;Could not persist currency preference:&apos;, error);
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
