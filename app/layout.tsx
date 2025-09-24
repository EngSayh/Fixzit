import './globals.css';
import '@/styles/rtl.css';
import { cookies } from 'next/headers';
import Providers from '@/src/providers/Providers';
import ClientLayout from '@/src/components/ClientLayout';
import { DEFAULT_LOCALE, LOCALE_META, type Locale } from '@/src/i18n/config';

export const metadata = {
  title: 'Fixzit Enterprise',
  description: 'Facility Management + Marketplace platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const cookieLocale = cookieStore.get('locale')?.value as Locale | undefined;
  const initialLocale = cookieLocale && LOCALE_META[cookieLocale] ? cookieLocale : DEFAULT_LOCALE;
  const meta = LOCALE_META[initialLocale];

  return (
    <html lang={initialLocale} dir={meta.dir} suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50">
        <Providers initialLocale={initialLocale}>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
