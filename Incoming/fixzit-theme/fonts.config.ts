/**
 * Fixzit Design System - Next.js Font Configuration
 * Based on Ejar.sa (Saudi Government Platforms Code)
 * 
 * Import and use these fonts in your layout.tsx file
 * 
 * @author Sultan Al Hassni
 * @version 1.0.0
 */

import {
  IBM_Plex_Sans,
  IBM_Plex_Sans_Arabic,
  IBM_Plex_Mono,
  Inter,
  Tajawal,
} from 'next/font/google';
// Note: localFont available for custom fonts when needed
// import localFont from 'next/font/local';

// ============================================
// ARABIC FONTS (Primary for RTL)
// ============================================

/**
 * IBM Plex Sans Arabic - Primary Arabic Body Font
 * Excellent readability and modern design
 * Matches well with IBM Plex Sans for English
 */
export const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['200', '300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-ibm-plex-arabic',
  preload: true,
});

/**
 * Tajawal - Alternative Arabic Font
 * Beautiful Arabic typeface with great legibility
 */
export const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['200', '300', '400', '500', '700', '800'],
  display: 'swap',
  variable: '--font-tajawal',
  preload: false, // Load on demand
});

// ============================================
// ENGLISH FONTS
// ============================================

/**
 * IBM Plex Sans - Primary English Body Font
 * Pairs perfectly with IBM Plex Sans Arabic
 */
export const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-ibm-plex-sans',
  preload: true,
});

/**
 * Inter - Primary Heading Font
 * Modern, clean geometric sans-serif
 */
export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

// ============================================
// MONOSPACE FONT
// ============================================

/**
 * IBM Plex Mono - Code and Technical Text
 */
export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-ibm-plex-mono',
  preload: false,
});

// ============================================
// OPTIONAL: LOCAL FONTS
// ============================================

/**
 * Alexandria Font (if you want to use it locally)
 * Download from: https://fonts.google.com/specimen/Alexandria
 * 
 * Uncomment and place font files in /public/fonts/
 */
// export const alexandria = localFont({
//   src: [
//     {
//       path: '../public/fonts/Alexandria-Regular.woff2',
//       weight: '400',
//       style: 'normal',
//     },
//     {
//       path: '../public/fonts/Alexandria-Medium.woff2',
//       weight: '500',
//       style: 'normal',
//     },
//     {
//       path: '../public/fonts/Alexandria-SemiBold.woff2',
//       weight: '600',
//       style: 'normal',
//     },
//     {
//       path: '../public/fonts/Alexandria-Bold.woff2',
//       weight: '700',
//       style: 'normal',
//     },
//   ],
//   variable: '--font-alexandria',
//   display: 'swap',
// });

// ============================================
// FONT VARIABLES (for className)
// ============================================

/**
 * Combined font variables string for use in layout.tsx
 * Usage: <html className={fontVariables}>
 */
export const fontVariables = [
  ibmPlexArabic.variable,
  ibmPlexSans.variable,
  inter.variable,
  tajawal.variable,
  ibmPlexMono.variable,
].join(' ');

// ============================================
// FONT STACK DEFINITIONS
// ============================================

export const fontStacks = {
  // Arabic-first font stack (for RTL)
  arabic: `var(--font-ibm-plex-arabic), var(--font-tajawal), "Noto Kufi Arabic", sans-serif`,
  
  // English font stack (for LTR)
  english: `var(--font-ibm-plex-sans), var(--font-inter), "Roboto", system-ui, sans-serif`,
  
  // Heading font stack
  heading: `var(--font-inter), var(--font-ibm-plex-arabic), sans-serif`,
  
  // Monospace font stack
  mono: `var(--font-ibm-plex-mono), "Fira Code", "Consolas", monospace`,
  
  // System font stack (fallback)
  system: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
} as const;

// ============================================
// EXAMPLE USAGE IN layout.tsx
// ============================================

/*
// app/[locale]/layout.tsx

import { fontVariables } from '@/lib/fonts';

export default function RootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  
  return (
    <html 
      lang={locale} 
      dir={dir}
      className={fontVariables}
    >
      <body className="font-sans antialiased bg-neutral-50 text-neutral-950">
        {children}
      </body>
    </html>
  );
}
*/

export default {
  ibmPlexArabic,
  ibmPlexSans,
  inter,
  tajawal,
  ibmPlexMono,
  fontVariables,
  fontStacks,
};
