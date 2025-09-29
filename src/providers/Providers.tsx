'use client';
import { useState, useEffect } from 'react';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { ThemeProvider } from '@/src/contexts/ThemeContext';
import { TranslationProvider } from '@/src/contexts/TranslationContext';
import { CurrencyProvider } from '@/src/contexts/CurrencyContext';
import { ResponsiveProvider } from '@/src/contexts/ResponsiveContext';
import ErrorBoundary from '@/src/components/ErrorBoundary';

/**
 * Wraps application content with global providers and prevents server-side rendering of children until running on the client.
 *
 * Renders a centered loading UI until the component mounts on the client. Once mounted it sets an immediate `isClient` flag and, after a short (100ms) delay, marks hydration as complete. When client rendering is active, children are rendered inside the provider tree:
 * ResponsiveProvider → TranslationProvider → CurrencyProvider → ThemeProvider → ErrorBoundary.
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
    <ResponsiveProvider>
      <TranslationProvider>
        <CurrencyProvider>
          <ThemeProvider>
            <ErrorBoundary>
              {isClient ? children : (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0061A8] mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                  </div>
                </div>
              )}
            </ErrorBoundary>
          </ThemeProvider>
        </CurrencyProvider>
      </TranslationProvider>
    </ResponsiveProvider>
  );
}

