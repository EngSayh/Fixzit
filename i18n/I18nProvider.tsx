'use client';

import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, LOCALE_META, SUPPORTED_LOCALES, type Locale } from './config';
import en from './dictionaries/en';
import ar from './dictionaries/ar';

const DICTIONARIES: Record<Locale, Record<string, unknown>> = {
  en,
  ar,
};

type ContextValue = {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  dict: Record<string, unknown>;
  // eslint-disable-next-line no-unused-vars
  setLocale: (locale: Locale, opts?: { persist?: boolean }) => void;
};

export const I18nContext = createContext<ContextValue | null>(null);

const STORAGE_KEYS = {
  locale: 'locale',
  legacyLocale: 'fxz.locale',
  language: 'fxz.lang',
};

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

export const I18nProvider: React.FC<{
  initialLocale?: Locale;
  children: React.ReactNode;
}> = ({ initialLocale = DEFAULT_LOCALE, children }) => {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const meta = LOCALE_META[locale];

  const setLocale = useCallback(
    (next: Locale, opts?: { persist?: boolean }) => {
      setLocaleState(next);
      if (opts?.persist === false) {
        return;
      }

      try {
        localStorage.setItem(STORAGE_KEYS.locale, next);
        localStorage.setItem(STORAGE_KEYS.legacyLocale, next === 'ar' ? 'ar-SA' : 'en-GB');
        localStorage.setItem(STORAGE_KEYS.language, next);
        setCookie('locale', next);
        setCookie('fxz.locale', next === 'ar' ? 'ar-SA' : 'en-GB');
        setCookie('fxz.lang', next);
        fetch('/api/i18n', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale: next }),
        }).catch(() => void 0);
      } catch {
        // ignore storage errors silently to avoid breaking UX
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const storedLocale = (localStorage.getItem(STORAGE_KEYS.locale) ||
        localStorage.getItem(STORAGE_KEYS.language)) as Locale | null;
      if (storedLocale && SUPPORTED_LOCALES.includes(storedLocale) && storedLocale !== locale) {
        setLocale(storedLocale);
      }
    } catch {
      // ignore
    }
  }, [locale, setLocale]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.lang = locale;
    document.documentElement.dir = meta.dir;
    document.documentElement.classList.toggle('rtl', meta.dir === 'rtl');
    document.documentElement.setAttribute('data-locale', locale);
    if (document.body) {
      document.body.style.direction = meta.dir;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('fixzit:language-change', {
          detail: { locale, language: locale, dir: meta.dir },
        })
      );
    }
  }, [locale, meta.dir]);

  const dict = useMemo(() => DICTIONARIES[locale], [locale]);

  const value = useMemo<ContextValue>(() => ({
    locale,
    dir: meta.dir,
    dict,
    setLocale,
  }), [dict, locale, meta.dir, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
