import "./globals.css";
// ⚡ PERFORMANCE OPTIMIZATION: Use conditional providers for route-based optimization
import ConditionalProviders from "@/providers/ConditionalProviders";
import ClientLayout from "@/components/ClientLayout";
import { Toaster } from 'sonner';
import { Inter, Noto_Sans_Arabic } from 'next/font/google';

// Initialize fonts - Inter for Latin, Noto Sans Arabic for RTL scripts
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
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        {/* Preconnect to font servers for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`min-h-screen bg-background ${inter.variable} ${notoSansArabic.variable}`}>
        <ConditionalProviders>
          <ClientLayout>
            {children}
          </ClientLayout>
          <Toaster 
            position="top-right"
            richColors
            closeButton
            duration={4000}
          />
        </ConditionalProviders>
      </body>
    </html>
  );
}
