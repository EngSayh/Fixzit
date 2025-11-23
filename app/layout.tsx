import type { Metadata } from 'next';
import './globals.css';
import ConditionalProviders from '@/providers/ConditionalProviders';
import { Toaster } from 'sonner';
import { Inter, Noto_Sans_Arabic } from 'next/font/google';
import ClientLayout from '@/components/ClientLayout';
import { getServerI18n } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'Fixzit Enterprise Platform',
  description: 'Unified FM + Souq + Aqar experience powered by Fixzit.',
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
  const { locale, isRTL } = await getServerI18n();
  const dir = isRTL ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning data-locale={locale}>
      <body
        className={`min-h-screen bg-background text-foreground ${inter.variable} ${notoSansArabic.variable}`}
        style={{ direction: dir }}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 z-50 bg-background text-foreground px-3 py-2 rounded-md shadow"
          data-testid="skip-to-content"
        >
          Skip to content
        </a>
        <ConditionalProviders initialLocale={locale}>
          <>
            <ClientLayout>
              {children}
            </ClientLayout>
            <Toaster
              position="top-right"
              richColors
              closeButton
              duration={4000}
            />
          </>
        </ConditionalProviders>
      </body>
    </html>
  );
}
