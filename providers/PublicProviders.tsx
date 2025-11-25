// ⚡ PERFORMANCE OPTIMIZATION: Essential provider tree for all pages
// Includes all providers needed by global UI components (TopBar, ClientLayout)
// These components render on ALL routes, so providers must always be available

"use client";
import React from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { I18nProvider } from "@/i18n/I18nProvider";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ResponsiveProvider } from "@/contexts/ResponsiveContext";
import { FormStateProvider } from "@/contexts/FormStateContext";
import { TopBarProvider } from "@/contexts/TopBarContext";
import { SupportOrgProvider } from "@/contexts/SupportOrgContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import type { Locale } from "@/i18n/config";

/**
 * Essential provider tree for public pages (homepage, about, privacy, terms)
 *
 * Provider hierarchy (outer → inner):
 * ErrorBoundary → SessionProvider → I18nProvider → ThemeProvider →
 * ResponsiveProvider → CurrencyProvider → FormStateProvider → TopBarProvider → children
 *
 * All these providers are required because TopBar and ClientLayout use:
 * - useSession() - authentication state
 * - useTranslation() - i18n context
 * - useTheme() - theme switching
 * - useResponsive() - responsive layout
 * - useCurrency() - currency formatting
 * - useFormState() - unsaved changes tracking
 * - useTopBar() - app context and routing (AppSwitcher)
 *
 * @param {React.ReactNode} children - Application content to render inside provider tree
 * @returns {JSX.Element} The complete provider tree with error protection
 */
export default function PublicProviders({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <I18nProvider initialLocale={initialLocale}>
          <ThemeProvider>
            <ResponsiveProvider>
              <CurrencyProvider>
                <FormStateProvider>
                  {/* Provide translations for public pages (TopBar and other global UI) */}
                  <TranslationProvider initialLanguage={initialLocale}>
                    <SupportOrgProvider>
                      <TopBarProvider>{children}</TopBarProvider>
                    </SupportOrgProvider>
                  </TranslationProvider>
                </FormStateProvider>
              </CurrencyProvider>
            </ResponsiveProvider>
          </ThemeProvider>
        </I18nProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
