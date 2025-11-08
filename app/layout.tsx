import "./globals.css";
// ⚡ PERFORMANCE OPTIMIZATION: Use conditional providers for route-based optimization
import ConditionalProviders from "@/providers/ConditionalProviders";
import ClientLayout from "@/components/ClientLayout";
import { Toaster } from 'sonner';
import { Inter, Tajawal } from 'next/font/google';

// Initialize fonts - Inter for Latin, Tajawal for Arabic
const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevents blocking - shows fallback font immediately
  variable: '--font-inter',
});

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-tajawal',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head>
        {/* Preconnect to font servers for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`min-h-screen bg-background ${inter.className} ${tajawal.variable}`}>
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
