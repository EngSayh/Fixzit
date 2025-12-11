// ⚡ PERFORMANCE OPTIMIZATION: Full provider tree for authenticated pages
// Adds authentication-specific providers on top of PublicProviders
// Only loaded for protected routes (not public pages)

"use client";
import React from "react";
import { TranslationProvider } from "@/contexts/TranslationContext";
import PublicProviders from "./PublicProviders";
import QueryProvider from "./QueryProvider";
import { SupportOrgProvider } from "@/contexts/SupportOrgContext";
import type { Locale } from "@/i18n/config";

/**
 * Complete provider tree for authenticated pages
 *
 * Wraps PublicProviders and adds authentication-specific providers:
 * - QueryProvider (TanStack Query for data fetching and caching)
 * - TranslationProvider (user-specific translations with backend sync)
 *
 * PublicProviders already includes:
 * - ErrorBoundary, SessionProvider, I18nProvider, ThemeProvider,
 *   ResponsiveProvider, CurrencyProvider, FormStateProvider, TopBarProvider
 *
 * Provider hierarchy (outer → inner):
 * PublicProviders (all base providers including TopBarProvider) →
 * QueryProvider (TanStack Query) →
 * TranslationProvider → children
 *
 * @param {React.ReactNode} children - Application content to render inside provider tree
 * @returns {JSX.Element} The complete provider tree with error protection
 */
export default function AuthenticatedProviders({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  return (
    <PublicProviders initialLocale={initialLocale}>
      <SupportOrgProvider>
        <QueryProvider>
          <TranslationProvider initialLanguage={initialLocale}>
            {children}
          </TranslationProvider>
        </QueryProvider>
      </SupportOrgProvider>
    </PublicProviders>
  );
}
