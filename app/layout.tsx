// app/layout.tsx
import './globals.css';
import { AppScopeProvider } from '@/src/contexts/AppScopeContext';
import { Providers } from '@/src/providers/RootProviders';
import { getServerDictionary } from '@/src/i18n/server';
import { DEFAULT_LANG, isRTL, type Lang } from '@/src/i18n/config';
import { cookies } from 'next/headers';
import ClientLayout from "@/src/components/ClientLayout";

// Force dynamic rendering to prevent build-time DB calls and ensure runtime data fetch
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Fixzit Enterprise', description: 'Facility Management + Marketplace' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const lang = (cookieStore.get('fxz_lang')?.value as Lang) || DEFAULT_LANG;
  const dict = await getServerDictionary(lang);
  const dir = isRTL(lang) ? 'rtl' : 'ltr';

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50">
        <Providers initialLang={lang} initialDict={dict}>
          <AppScopeProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
          </AppScopeProvider>
        </Providers>
      </body>
    </html>
  );
}