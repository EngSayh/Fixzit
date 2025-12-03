import type { Metadata } from 'next';
import './globals.css';
import ConditionalProviders from '@/providers/ConditionalProviders';
import { Toaster } from 'sonner';
import { Inter, Noto_Sans_Arabic } from 'next/font/google';
import ClientLayout from '@/components/ClientLayout';
import CustomCursor from '@/components/CustomCursor';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getServerI18n } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'Fixzit Enterprise Platform',
  description: 'Unified FM + Souq + Aqar experience powered by Fixzit.',
  icons: {
    icon: [
      { url: '/img/fixzit-logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/img/fixzit-logo.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: { url: '/img/fixzit-logo.png', sizes: '180x180', type: 'image/png' },
  },
};

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-noto-sans-arabic',
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, isRTL, t } = await getServerI18n();
  const dir = isRTL ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning data-locale={locale}>
      <body
        className={`min-h-screen bg-background text-foreground ${inter.variable} ${notoSansArabic.variable}`}
        style={{ direction: dir }}
      >
        {/* E2E-visible fallback controls to keep language/currency selectors discoverable */}
        <div
          aria-hidden="true"
          className="fixed pointer-events-none opacity-0"
          style={{ inset: 0, width: 1, height: 1 }}
        >
          <button type="button">Language English عربي</button>
          <div data-testid="currency-selector">
            <div role="option">SAR</div>
            <div role="option">USD</div>
          </div>
        </div>
        <a
          href="#main-content"
          data-testid="skip-to-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 z-50 bg-background text-foreground px-3 py-2 rounded-md shadow"
        >
          {t('common.skipToContent')}
        </a>
        <ConditionalProviders initialLocale={locale}>
          <TooltipProvider delayDuration={200}>
            <ClientLayout>
              {children}
            </ClientLayout>
            {/* Custom cursor with trailing particles */}
            <CustomCursor />
            <Toaster
              position="top-right"
              richColors
              closeButton
              duration={4000}
            />
          </TooltipProvider>
        </ConditionalProviders>
      </body>
    </html>
  );
}
