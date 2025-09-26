'use client&apos;;
import { useState, useEffect } from &apos;react&apos;;
import { ThemeProvider } from &apos;@/src/contexts/ThemeContext&apos;;
import { TranslationProvider } from &apos;@/src/contexts/TranslationContext&apos;;
import { CurrencyProvider } from &apos;@/src/contexts/CurrencyContext&apos;;
import { ResponsiveProvider } from &apos;@/src/contexts/ResponsiveContext&apos;;
import ErrorBoundary from &apos;@/src/components/ErrorBoundary&apos;;

export default function Providers({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set client flag immediately for screen detection
    setIsClient(true);
  }, []);

  // Don&apos;t render children until we&apos;re on the client side to avoid SSR issues
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
      <TranslationProvider>
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

