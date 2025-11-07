// ⚡ PERFORMANCE OPTIMIZATION: Full provider tree for authenticated pages
// Includes all context providers needed for authenticated user experience
// Only loaded for protected routes (not public pages)

'use client';
import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { TranslationProvider } from '@/contexts/TranslationContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ResponsiveProvider } from '@/contexts/ResponsiveContext';
import { TopBarProvider } from '@/contexts/TopBarContext';
import { FormStateProvider } from '@/contexts/FormStateContext';
import PublicProviders from './PublicProviders';

/**
 * Complete provider tree for authenticated pages
 * 
 * Wraps PublicProviders and adds authentication-specific providers:
 * - SessionProvider (NextAuth)
 * - TranslationProvider (user-specific translations)
 * - CurrencyProvider (user currency preferences)
 * - ResponsiveProvider (responsive UI state)
 * - TopBarProvider (navigation state)
 * - FormStateProvider (form state management)
 * 
 * Provider hierarchy (outer → inner):
 * PublicProviders (ErrorBoundary → I18nProvider → ThemeProvider) →
 * SessionProvider → TranslationProvider → ResponsiveProvider →
 * CurrencyProvider → TopBarProvider → FormStateProvider → children
 * 
 * @param {React.ReactNode} children - Application content to render inside provider tree
 * @returns {JSX.Element} The complete provider tree with error protection
 */
export default function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  return (
    <PublicProviders>
      <SessionProvider>
        <TranslationProvider>
          <ResponsiveProvider>
            <CurrencyProvider>
              <TopBarProvider>
                <FormStateProvider>
                  {children}
                </FormStateProvider>
              </TopBarProvider>
            </CurrencyProvider>
          </ResponsiveProvider>
        </TranslationProvider>
      </SessionProvider>
    </PublicProviders>
  );
}
