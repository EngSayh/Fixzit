import type { Metadata } from 'next';
import './globals.css';
import ConditionalProviders from '@/providers/ConditionalProviders';
import { Toaster } from 'sonner';
import { Inter, Noto_Sans_Arabic } from 'next/font/google';
import ClientLayout from '@/components/ClientLayout';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`min-h-screen bg-background text-foreground ${inter.variable} ${notoSansArabic.variable}`}>
        <ConditionalProviders>
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
