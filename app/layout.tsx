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

/**
 * Server-side root layout that initializes i18n and app providers and renders the page root.
 *
 * Reads the user's language from the `fxz_lang` cookie (falls back to `DEFAULT_LANG`), fetches
 * the server-side translation dictionary for that language, and computes the document text
 * direction (`rtl` or `ltr`). Returns the HTML root element with `lang` and `dir` attributes and
 * wraps the page `children` with the initialized Providers, AppScopeProvider, and ClientLayout.
 *
 * @param children - The page content to render inside the client layout.
 * @returns The top-level HTML/Body JSX structure for the app.
 */
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