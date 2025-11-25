"use client";
import React from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ResponsiveProvider } from "@/contexts/ResponsiveContext";
import { TopBarProvider } from "@/contexts/TopBarContext";
import { FormStateProvider } from "@/contexts/FormStateContext";
import { I18nProvider } from "@/i18n/I18nProvider";
import ErrorBoundary from "@/components/ErrorBoundary";

/**
 * Global provider tree wrapper for the application
 *
 * 🔒 ARCHITECTURE FIX: ErrorBoundary now wraps ALL providers (not just FormStateProvider)
 * - This protects 100% of the app from crashes in any provider initialization
 * - Previously only FormStateProvider was protected (~10% coverage)
 *
 * 🚀 SSR FIX: Removed isClient anti-pattern that blocked server-side rendering
 * - All providers now support SSR properly
 * - Improves initial page load performance and SEO
 * - Providers use proper SSR-safe patterns internally
 *
 * Provider hierarchy (outer → inner):
 * ErrorBoundary → SessionProvider → I18nProvider → TranslationProvider →
 * ResponsiveProvider → CurrencyProvider → ThemeProvider → TopBarProvider →
 * FormStateProvider → children
 *
 * @param {React.ReactNode} children - Application content to render inside provider tree
 * @returns {JSX.Element} The complete provider tree with error protection
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <I18nProvider>
          <TranslationProvider>
            <ResponsiveProvider>
              <CurrencyProvider>
                <ThemeProvider>
                  <TopBarProvider>
                    <FormStateProvider>{children}</FormStateProvider>
                  </TopBarProvider>
                </ThemeProvider>
              </CurrencyProvider>
            </ResponsiveProvider>
          </TranslationProvider>
        </I18nProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
