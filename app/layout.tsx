import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { I18nProvider } from '../contexts/I18nContext';
import { AuroraBackground } from '../src/components/theme';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FIXZIT SOUQ - Enterprise Property Management | فكس إت سوق - إدارة العقارات للمؤسسات',
  description: 'Complete solution for property management and facility operations | حل شامل لإدارة العقارات وعمليات المرافق',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body className={`${inter.className} relative min-h-screen overflow-x-hidden`}>
        {/* Dramatic System-wide Aurora Background - Multiple Layers */}
        <div className="fixed inset-0 -z-50 overflow-hidden">
          {/* Layer 1: Main Aurora Effect */}
          <AuroraBackground 
            variant="dramatic"
            animate={true}
            className="absolute inset-0 w-full h-full"
          />
          
          {/* Layer 2: Additional Color Overlay */}
          <div 
            className="absolute inset-0 opacity-60"
            style={{
              background: `
                radial-gradient(
                  ellipse at 30% 20%,
                  rgba(0, 97, 168, 0.4) 0%,
                  transparent 50%
                ),
                radial-gradient(
                  ellipse at 70% 80%,
                  rgba(0, 168, 89, 0.35) 0%,
                  transparent 50%
                ),
                radial-gradient(
                  ellipse at 10% 50%,
                  rgba(255, 180, 0, 0.2) 0%,
                  transparent 40%
                )
              `,
              filter: 'blur(80px)',
              animation: 'aurora-flow 30s ease-in-out infinite',
            }}
          />
          
          {/* Layer 3: Moving Orbs for Dynamic Effect */}
          <div 
            className="absolute top-0 left-0 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/2 animate-aurora-float opacity-70"
            style={{
              background: 'radial-gradient(circle, rgba(47, 120, 255, 0.3) 0%, transparent 70%)',
              filter: 'blur(100px)',
            }}
          />
          <div 
            className="absolute bottom-0 right-0 w-[600px] h-[600px] translate-x-1/3 translate-y-1/3 animate-aurora-float-reverse opacity-60"
            style={{
              background: 'radial-gradient(circle, rgba(0, 168, 89, 0.3) 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
          
          {/* Layer 4: Dark gradient for contrast */}
          <div 
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(
                  to bottom,
                  rgba(0, 0, 0, 0.02) 0%,
                  rgba(0, 0, 0, 0.08) 100%
                )
              `,
            }}
          />
        </div>
        
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}