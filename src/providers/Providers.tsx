'use client';
import { useState, useEffect, type ReactNode } from 'react';
import { ThemeProvider } from '@/src/contexts/ThemeContext';
import { TranslationProvider } from '@/src/contexts/TranslationContext';
import { CurrencyProvider } from '@/src/contexts/CurrencyContext';
import { ResponsiveProvider } from '@/src/contexts/ResponsiveContext';
import ErrorBoundary from '@/src/components/ErrorBoundary';

import type { Locale } from '@/src/i18n/config';

interface ProvidersProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export default function Providers({ children, initialLocale }: ProvidersProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set client flag immediately for screen detection
    setIsClient(true);
  }, []);

  // Don't render children until we're on the client side to avoid SSR issues
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0061A8] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveProvider>
      <TranslationProvider initialLocale={initialLocale}>
        <CurrencyProvider>
          <ThemeProvider>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </ThemeProvider>
        </CurrencyProvider>
      </TranslationProvider>
    </ResponsiveProvider>
  );
}

