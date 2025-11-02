import "./globals.css";
import Providers from '@/providers/Providers';
import ClientLayout from '@/components/ClientLayout';
import { Toaster } from 'sonner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body className="min-h-screen bg-background">
        <Providers>
          <ClientLayout>
            {children}
          </ClientLayout>
          <Toaster 
            position="top-right"
            richColors
            closeButton
            duration={4000}
          />
        </Providers>
      </body>
    </html>
  );
}
