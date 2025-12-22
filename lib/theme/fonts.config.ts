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
  Alexandria,
} from 'next/font/google';

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

/**
 * Alexandria - Geometric Arabic Heading Font
 * Modern, clean design perfect for headings
 */
export const alexandria = Alexandria({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-alexandria',
  preload: true,
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
  alexandria.variable,
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
  
  // Arabic heading font stack
  headingAr: `var(--font-alexandria), var(--font-ibm-plex-arabic), sans-serif`,
  
  // English heading font stack
  headingEn: `var(--font-inter), var(--font-ibm-plex-sans), sans-serif`,
  
  // Monospace font stack
  mono: `var(--font-ibm-plex-mono), "Fira Code", "Consolas", monospace`,
  
  // System font stack (fallback)
  system: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
} as const;

// ============================================
// FONT OBJECTS EXPORT
// ============================================

export const fonts = {
  ibmPlexArabic,
  ibmPlexSans,
  inter,
  alexandria,
  tajawal,
  ibmPlexMono,
} as const;

export default {
  ibmPlexArabic,
  ibmPlexSans,
  inter,
  alexandria,
  tajawal,
  ibmPlexMono,
  fontVariables,
  fontStacks,
  fonts,
};
