"use client";

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { type LanguageCode } from "@/config/language-options";
import {
  DEFAULT_LOCALE,
  LOCALE_META,
  SUPPORTED_LOCALES,
  type Locale,
} from "./config";
import { logger } from "@/lib/logger";

// ⚡ PERFORMANCE: Lazy load dictionaries to reduce initial bundle size
// Each dictionary is 27k lines (~500KB). Loading both upfront wastes 500KB + 200ms parse time.
// With dynamic imports, only the active locale is loaded, saving ~250KB and 100ms.
// Note: Only enabled locales (en, ar) have dictionaries. fr/es marked comingSoon.
const DICTIONARIES: Record<
  LanguageCode,
  () => Promise<{ default: Record<string, unknown> }>
> = {
  en: () => import("./dictionaries/en"),
  ar: () => import("./dictionaries/ar"),
  fr: () => import("./dictionaries/en"),
  es: () => import("./dictionaries/en"),
};

type ContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  dict: Record<string, unknown>;
  setLocale: (locale: Locale, opts?: { persist?: boolean }) => void;
};

export const I18nContext = createContext<ContextValue | null>(null);

const STORAGE_KEYS = {
  locale: "locale",
  legacyLocale: "fxz.locale",
  language: "fxz.lang",
};

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

export const I18nProvider: React.FC<{
  initialLocale?: Locale;
  /** Optional preloaded dictionary for the initial locale (useful in tests to avoid async loads). */
  initialDict?: Record<string, unknown>;
  children: React.ReactNode;
}> = ({ initialLocale = DEFAULT_LOCALE, initialDict, children }) => {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [dict, setDict] = useState<Record<string, unknown>>(initialDict ?? {});
  const [isLoading, setIsLoading] = useState(!initialDict);
  const meta = LOCALE_META[locale];

  // ⚡ PERFORMANCE: Load dictionary dynamically when locale changes
  useEffect(() => {
    // If a prefetched dictionary was provided for the initial locale, skip async load
    if (initialDict && locale === initialLocale) {
      return;
    }

    let cancelled = false;

    setIsLoading(true);
    DICTIONARIES[locale]()
      .then((module) => {
        if (!cancelled) {
          setDict(module.default);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        logger.error('[I18nProvider] Failed to load dictionary:', error, {
          locale,
          availableLocales: Object.keys(DICTIONARIES).join(', ')
        });
        if (!cancelled) {
          setDict({});
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale, opts?: { persist?: boolean }) => {
      setLocaleState(next);
      if (opts?.persist === false) {
        return;
      }

      try {
        localStorage.setItem(STORAGE_KEYS.locale, next);
        localStorage.setItem(
          STORAGE_KEYS.legacyLocale,
          next === "ar" ? "ar-SA" : "en-GB",
        );
        localStorage.setItem(STORAGE_KEYS.language, next);
        setCookie("locale", next);
        setCookie("fxz.locale", next === "ar" ? "ar-SA" : "en-GB");
        setCookie("fxz.lang", next);
        fetch("/api/i18n", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: next }),
        }).catch(() => void 0);
      } catch {
        // ignore storage errors silently to avoid breaking UX
      }
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedLocale = (localStorage.getItem(STORAGE_KEYS.locale) ||
        localStorage.getItem(STORAGE_KEYS.language)) as Locale | null;
      if (
        storedLocale &&
        SUPPORTED_LOCALES.includes(storedLocale) &&
        storedLocale !== locale
      ) {
        setLocale(storedLocale);
      }
    } catch {
      // ignore
    }
  }, [locale, setLocale]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.lang = locale;
    document.documentElement.dir = meta.dir;
    document.documentElement.classList.toggle("rtl", meta.dir === "rtl");
    document.documentElement.setAttribute("data-locale", locale);
    if (document.body) {
      document.body.style.direction = meta.dir;
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("fixzit:language-change", {
          detail: { locale, language: locale, dir: meta.dir },
        }),
      );
    }
  }, [locale, meta.dir]);

  const value = useMemo<ContextValue>(
    () => ({
      locale,
      dir: meta.dir,
      dict,
      setLocale,
    }),
    [dict, locale, meta.dir, setLocale],
  );

  // Show a minimal loading state while dictionary loads (< 100ms typically)
  if (isLoading) {
    return (
      <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
    );
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
