"use client";

/**
 * Superadmin Layout
 * Complete control center layout with sidebar navigation
 * Provides i18n context for translations
 * 
 * @module app/superadmin/layout
 */

import { I18nProvider } from "@/i18n/I18nProvider";
import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "@/i18n/config";
import { SuperadminSidebar } from "@/components/superadmin/SuperadminSidebar";
import { SuperadminHeader } from "@/components/superadmin/SuperadminHeader";
import { usePathname } from "next/navigation";

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [dict, setDict] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  // Don't show shell on login page
  const isLoginPage = pathname === "/superadmin/login";

  useEffect(() => {
    const resolveLocale = (): Locale => {
      try {
        const storedLocale = localStorage.getItem("locale") as Locale | null;
        if (storedLocale && SUPPORTED_LOCALES.includes(storedLocale)) {
          return storedLocale;
        }
      } catch {
        // Ignore storage errors (private browsing or disabled storage)
      }

      const [languageCode] = navigator.language.split("-");
      const browserLocale = languageCode as Locale;
      if (browserLocale && SUPPORTED_LOCALES.includes(browserLocale)) {
        return browserLocale;
      }

      return DEFAULT_LOCALE;
    };

    const nextLocale = resolveLocale();
    setLocale(nextLocale);

    const loadDict = async (targetLocale: Locale) => {
      try {
        const dictModule = await import(`@/i18n/dictionaries/${targetLocale}`);
        setDict(dictModule.default);
      } catch (_error) {
        try {
          const fallback = await import("@/i18n/dictionaries/en");
          setDict(fallback.default);
        } catch {
          setDict({});
        }
      } finally {
        setLoading(false);
      }
    };

    void loadDict(nextLocale);
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
      {isLoginPage ? (
        <div className="min-h-screen bg-slate-900">
          {children}
        </div>
      ) : (
        <div className="min-h-screen bg-slate-950 flex">
          {/* Sidebar */}
          <SuperadminSidebar />
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <SuperadminHeader />
            
            {/* Page Content */}
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      )}
    </I18nProvider>
  );
}
