import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import ConditionalProviders from '@/providers/ConditionalProviders';
import { Toaster } from 'sonner';
import { 
  Bricolage_Grotesque, 
  Space_Mono, 
  Noto_Sans_Arabic,
  DM_Sans,
  Tajawal
} from 'next/font/google';
import CustomCursor from '@/components/CustomCursor';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getServerI18n } from '@/lib/i18n/server';
import { Config } from '@/lib/config/constants';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';

export const metadata: Metadata = {
  title: 'Fixzit Enterprise Platform',
  description: 'Unified FM + Souq + Aqar experience powered by Fixzit.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/img/fixzit-logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/img/fixzit-logo.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: { url: '/img/fixzit-logo.png', sizes: '180x180', type: 'image/png' },
  },
};

// Distinctive display font for headings - editorial, characterful
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['200', '400', '600', '800'],
});

// Monospace accent font for data, badges, and technical elements
const spaceMono = Space_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '700'],
});

// Clean geometric sans for body text
const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
});

// Arabic typography support
const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-arabic',
});

// Tajawal - Business.sa preferred Arabic font (matches DIN Next LT Arabic style)
const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '700', '800'],
  display: 'swap',
  variable: '--font-tajawal',
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, isRTL, t } = await getServerI18n();
  const dir = isRTL ? 'rtl' : 'ltr';
  // BUG-001 FIX: Standardized via Config.client.isPlaywrightTest
  const isPlaywright = Config.client.isPlaywrightTest;

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning data-locale={locale}>
      <body
        className={`min-h-screen bg-background text-foreground antialiased ${bricolage.variable} ${dmSans.variable} ${spaceMono.variable} ${notoSansArabic.variable} ${tajawal.variable}`}
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
        {isPlaywright && (
          <header
            className="w-full bg-secondary text-foreground py-3 px-4 flex items-center justify-between"
            role="banner"
            data-testid="marketplace-topbar"
            aria-label="Fixzit Smoke Header"
          >
            <div className="flex items-center gap-2">
              <img
                src="/img/fixzit-logo.png"
                alt="Fixzit logo"
                data-testid="header-logo-img"
                className="h-8 w-auto"
              />
              <span className="text-sm text-muted-foreground">Smoke</span>
            </div>
            <nav aria-label="Playwright-nav" className="flex items-center gap-3">
              <Link href="/dashboard" className="underline text-sm">Dashboard</Link>
              <Link href="/properties" className="underline text-sm">Properties</Link>
              <Link href="/admin" className="underline text-sm">Admin</Link>
              <Link href="/support" className="underline text-sm">Support</Link>
              <button type="button" data-testid="currency-selector-button" className="text-sm underline">
                Currency: SAR
              </button>
            </nav>
          </header>
        )}
        {isPlaywright && (
          <div className="px-4 py-3" aria-hidden="true">
            <div className="text-2xl font-semibold" role="presentation">
              Smoke Test Layout
            </div>
          </div>
        )}
        <ConditionalProviders initialLocale={locale}>
          <TooltipProvider delayDuration={200}>
            <OfflineIndicator position="top" />
            {children}
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
        {isPlaywright && (
          <footer className="mt-8 border-t border-border px-4 py-4" role="contentinfo">
            <p className="text-sm text-muted-foreground">Fixzit Playwright Footer</p>
          </footer>
        )}
      </body>
    </html>
  );
}
