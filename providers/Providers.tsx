'use client';
import React, { useState, useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TranslationProvider } from '@/contexts/TranslationContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ResponsiveProvider } from '@/contexts/ResponsiveContext';
import { TopBarProvider } from '@/contexts/TopBarContext';
import { FormStateProvider } from '@/contexts/FormStateContext';
import { I18nProvider } from '@/i18n/I18nProvider';
import ErrorBoundary from '@/components/ErrorBoundary';

/**
 * Wraps application content with global providers and prevents server-side rendering of children until running on the client.
 *
 * Renders a centered loading UI until the component mounts on the client. Once mounted it sets the `isClient` flag.
 * When client rendering is active, children are rendered inside the provider tree:
 * SessionProvider → ResponsiveProvider → I18nProvider → TranslationProvider → CurrencyProvider → ThemeProvider → TopBarProvider → ErrorBoundary → FormStateProvider.
 *
 * SessionProvider wraps the entire provider tree to make NextAuth session available throughout the app.
 * ErrorBoundary wraps FormStateProvider to catch any errors thrown during form state initialization or updates.
 *
 * @param {React.ReactNode} children - The React node(s) to render inside the provider tree; these are not mounted during SSR and will only be rendered client-side after the component sets the client flag.
 * @returns {JSX.Element} The provider tree wrapper or a loading indicator.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set client flag immediately for screen detection
    setIsClient(true);
  }, []);

  // Don't render children until we're on the client side to avoid SSR issues
  if (!isClient) {
    // Minimal localized fallback without using hooks pre-provider
    const t = (k: string, f?: string) => f ?? k;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0061A8] mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  return (
    <SessionProvider>
      <I18nProvider>
        <TranslationProvider>
          <ResponsiveProvider>
            <CurrencyProvider>
              <ThemeProvider>
                <TopBarProvider>
                  <ErrorBoundary>
                    <FormStateProvider>
                      {children}
                    </FormStateProvider>
                  </ErrorBoundary>
                </TopBarProvider>
              </ThemeProvider>
            </CurrencyProvider>
          </ResponsiveProvider>
        </TranslationProvider>
      </I18nProvider>
    </SessionProvider>
  );
}



