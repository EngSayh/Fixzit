// src/providers/RootProviders.tsx
'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { LANGUAGES, DEFAULT_LANG, isRTL, type Lang } from '@/src/i18n/config';

type Dict = Record<string, any>;
type I18nCtx = {
  lang: Lang;
  language: Lang;
  dir: 'rtl' | 'ltr';
  isRTL: boolean;
  dict: Dict;
  t: (path: string, fallback?: string) => string;
  setLanguage: (lang: Lang) => void;
};

const I18nContext = createContext<I18nCtx | null>(null);

// simple deep getter: t('sidebar.workOrders', 'fallback')
function get(dict: Dict, path: string, fallback?: string): string {
  return path.split('.').reduce((acc: any, key) => (acc ? acc[key] : undefined), dict) ?? fallback ?? path;
}

export function Providers(props: { initialLang: Lang; initialDict: Dict; children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(props.initialLang ?? DEFAULT_LANG);
  const [dict, setDict] = useState<Dict>(props.initialDict ?? {});
  const dir = isRTL(lang) ? 'rtl' : 'ltr';

  // keep <html> attributes in sync instantly (no reload)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      html.setAttribute('lang', lang);
      html.setAttribute('dir', dir);
    }
  }, [lang, dir]);

  const t = useMemo(() => (path: string, fallback?: string) => get(dict, path, fallback), [dict]);

  const setLanguage = (next: Lang) => {
    setLang(next);
    document.cookie = `fxz_lang=${next}; path=/; max-age=31536000; SameSite=Lax`;
    // dynamic import for dictionary to avoid reload
    if (next === 'ar') {
      import('@/src/i18n/dictionaries/ar').then(({ default: d }) => setDict(d));
    } else {
      import('@/src/i18n/dictionaries/en').then(({ default: d }) => setDict(d));
    }
    // optional: fire-and-forget DB persistence (if logged in)
    fetch('/api/me/language', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: next }) }).catch(() => {});
  };

  const value: I18nCtx = { lang, language: lang, dir, isRTL: dir === 'rtl', dict, t, setLanguage };
  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
}

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within Providers');
  return ctx;
};
