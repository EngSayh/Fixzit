// ⚡ PERFORMANCE OPTIMIZATION: Full provider tree for authenticated pages
// Adds authentication-specific providers on top of PublicProviders
// Only loaded for protected routes (not public pages)

'use client';
import React from 'react';
import { TranslationProvider } from '@/contexts/TranslationContext';
import PublicProviders from './PublicProviders';

/**
 * Complete provider tree for authenticated pages
 * 
 * Wraps PublicProviders and adds authentication-specific providers:
 * - TranslationProvider (user-specific translations with backend sync)
 * 
 * PublicProviders already includes:
 * - ErrorBoundary, SessionProvider, I18nProvider, ThemeProvider,
 *   ResponsiveProvider, CurrencyProvider, FormStateProvider, TopBarProvider
 * 
 * Provider hierarchy (outer → inner):
 * PublicProviders (all base providers including TopBarProvider) →
 * TranslationProvider → children
 * 
 * @param {React.ReactNode} children - Application content to render inside provider tree
 * @returns {JSX.Element} The complete provider tree with error protection
 */
export default function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  return (
    <PublicProviders>
      <TranslationProvider>
        {children}
      </TranslationProvider>
    </PublicProviders>
  );
}
