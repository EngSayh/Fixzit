"use client";

/**
 * Superadmin Layout
 * Minimal layout for superadmin pages without main app shell
 * Provides i18n context for translations
 * 
 * @module app/superadmin/layout
 */

import { I18nProvider } from "@/i18n/I18nProvider";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>("en");
  const [dict, setDict] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Detect browser locale or load from localStorage
    const savedLocale = localStorage.getItem("locale") as Locale | null;
    const browserLocale = navigator.language.split("-")[0] as Locale;
    const initialLocale = savedLocale || browserLocale === "ar" ? "ar" : "en";
    
    setLocale(initialLocale);
    
    // Load dictionary dynamically
    const loadDict = async () => {
      try {
        const dictModule = await import(`@/i18n/dictionaries/${initialLocale}`);
        setDict(dictModule.default);
      } catch (_error) {
        // Fallback to English
        const fallback = await import("@/i18n/dictionaries/en");
        setDict(fallback.default);
      } finally {
        setLoading(false);
      }
    };
    
    loadDict();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <I18nProvider initialLocale={locale} initialDict={dict}>
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </I18nProvider>
  );
}
