/**
 * Fixzit Design System - Theme Constants
 * Based on Ejar.sa (Saudi Government Platforms Code)
 * 
 * Use these constants for programmatic access to theme values
 * in React components, styled-components, or any JS/TS context.
 * 
 * @author Sultan Al Hassni
 * @version 1.0.0
 */

// ============================================
// COLOR PALETTE
// ============================================

export const colors = {
  // Primary Brand (Ejar Green)
  primary: {
    50: '#E8F7EE',
    100: '#C7EAD8',
    200: '#8FD4B1',
    300: '#5FBD8E',
    400: '#3BA874',
    500: '#25935F', // Main brand color
    600: '#188352', // Hover
    700: '#166A45', // Active
    800: '#0F5535',
    900: '#0A3D26',
    950: '#052918',
    DEFAULT: '#25935F',
  },

  // Secondary (Lavender)
  secondary: {
    50: '#F5F0F8',
    100: '#EBE1F1',
    200: '#D7C3E3',
    300: '#C3A5D5',
    400: '#A177BE',
    500: '#80519F',
    600: '#6A4385',
    700: '#54356B',
    800: '#3E2751',
    900: '#281937',
    950: '#1A0F24',
    DEFAULT: '#80519F',
  },

  // Neutral/Gray
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#CFD4DB',
    400: '#A8AEB8',
    500: '#8A919C',
    600: '#6C737F',
    700: '#434B5A',
    800: '#2D3340',
    900: '#1A1F2B',
    950: '#0D121C',
  },

  // Success
  success: {
    50: '#ECFDF5',
    100: '#D4F4E5',
    200: '#A7E9CA',
    300: '#6DDAA5',
    400: '#34C77D',
    500: '#17B26A',
    600: '#0F9A58',
    700: '#0F8A51',
    800: '#106B41',
    900: '#0F5835',
    950: '#05311D',
    DEFAULT: '#17B26A',
  },

  // Error
  error: {
    50: '#FEF3F2',
    100: '#FEEAE9',
    200: '#FECDCA',
    300: '#FDA29B',
    400: '#F97066',
    500: '#F04438',
    600: '#D92D20',
    700: '#B42318',
    800: '#912018',
    900: '#7A271A',
    950: '#55160C',
    DEFAULT: '#F04438',
  },

  // Warning
  warning: {
    50: '#FFFAEB',
    100: '#FEF3E7',
    200: '#FEDF89',
    300: '#FEC84B',
    400: '#FDB022',
    500: '#F79009',
    600: '#DC6803',
    700: '#B54708',
    800: '#93370D',
    900: '#7A2E0E',
    950: '#4E1D09',
    DEFAULT: '#F79009',
  },

  // Info
  info: {
    50: '#EFF8FF',
    100: '#E7F3FF',
    200: '#B2DDFF',
    300: '#84CAFF',
    400: '#53B1FD',
    500: '#2E90FA',
    600: '#1570EF',
    700: '#175CD3',
    800: '#1849A9',
    900: '#194185',
    950: '#102A56',
    DEFAULT: '#2E90FA',
  },

  // Special Colors
  gold: '#F5BD02',
  saudiGreen: '#006C35',
  white: '#FFFFFF',
  black: '#000000',
} as const;

// ============================================
// SEMANTIC COLOR TOKENS
// ============================================

export const semanticColors = {
  // Backgrounds
  background: {
    primary: colors.white,
    secondary: colors.neutral[50],
    tertiary: colors.neutral[100],
    inverse: colors.neutral[950],
    brand: colors.primary[500],
    brandSubtle: colors.primary[50],
  },

  // Text/Foreground
  text: {
    primary: colors.neutral[950],
    secondary: colors.neutral[700],
    tertiary: colors.neutral[600],
    placeholder: colors.neutral[500],
    disabled: colors.neutral[400],
    inverse: colors.white,
    brand: colors.primary[600],
    link: colors.primary[600],
    linkHover: colors.primary[700],
  },

  // Borders
  border: {
    primary: colors.neutral[200],
    secondary: colors.neutral[300],
    tertiary: colors.neutral[400],
    focus: colors.primary[500],
    error: colors.error[500],
  },
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  // Font Families
  fontFamily: {
    arabic: '"IBM Plex Sans Arabic", "Tajawal", "Noto Kufi Arabic", sans-serif',
    english: '"IBM Plex Sans", "Inter", "Roboto", system-ui, sans-serif',
    headingAr: '"Alexandria", "IBM Plex Sans Arabic", sans-serif',
    headingEn: '"Inter", "IBM Plex Sans", sans-serif',
    mono: '"IBM Plex Mono", "Fira Code", monospace',
  },

  // Font Sizes (in rem)
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    md: '1rem',       // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem',  // 72px
  },

  // Font Sizes (in px)
  fontSizePx: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
    '7xl': 72,
  },

  // Line Heights
  lineHeight: {
    tight: 1.15,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.625,
    loose: 1.75,
  },

  // Font Weights
  fontWeight: {
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
  },
} as const;

// ============================================
// SPACING
// ============================================

export const spacing = {
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
} as const;

// Spacing in pixels
export const spacingPx = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,
} as const;

// ============================================
// SIZING
// ============================================

export const sizing = {
  // Component Heights
  header: '4.5rem',        // 72px
  headerMobile: '4rem',    // 64px
  trustBanner: '2.5rem',   // 40px
  inputSm: '2rem',         // 32px
  inputMd: '2.5rem',       // 40px
  inputLg: '3rem',         // 48px
  buttonSm: '2rem',        // 32px
  buttonMd: '2.5rem',      // 40px
  buttonLg: '3rem',        // 48px

  // Container Widths
  containerSm: '640px',
  containerMd: '768px',
  containerLg: '1024px',
  containerXl: '1280px',
  container2xl: '1400px',

  // Sidebar
  sidebar: '280px',
  sidebarCollapsed: '80px',
} as const;

export const sizingPx = {
  header: 72,
  headerMobile: 64,
  trustBanner: 40,
  inputSm: 32,
  inputMd: 40,
  inputLg: 48,
  buttonSm: 32,
  buttonMd: 40,
  buttonLg: 48,
  containerSm: 640,
  containerMd: 768,
  containerLg: 1024,
  containerXl: 1280,
  container2xl: 1400,
  sidebar: 280,
  sidebarCollapsed: 80,
} as const;

// ============================================
// BORDERS
// ============================================

export const borders = {
  width: {
    0: '0',
    1: '1px',
    2: '2px',
    4: '4px',
  },
  radius: {
    none: '0',
    xs: '0.125rem',   // 2px
    sm: '0.25rem',    // 4px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    '3xl': '2rem',    // 32px
    full: '9999px',
  },
} as const;

export const borderRadiusPx = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

// ============================================
// SHADOWS
// ============================================

export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(13, 18, 28, 0.05)',
  sm: '0 1px 3px 0 rgba(13, 18, 28, 0.1), 0 1px 2px -1px rgba(13, 18, 28, 0.1)',
  md: '0 4px 6px -1px rgba(13, 18, 28, 0.1), 0 2px 4px -2px rgba(13, 18, 28, 0.1)',
  lg: '0 10px 15px -3px rgba(13, 18, 28, 0.1), 0 4px 6px -4px rgba(13, 18, 28, 0.1)',
  xl: '0 20px 25px -5px rgba(13, 18, 28, 0.1), 0 8px 10px -6px rgba(13, 18, 28, 0.1)',
  '2xl': '0 25px 50px -12px rgba(13, 18, 28, 0.25)',
  '3xl': '0 35px 60px -15px rgba(13, 18, 28, 0.3)',
  // Semantic
  card: '0 2px 8px rgba(13, 18, 28, 0.08)',
  cardHover: '0 8px 24px rgba(13, 18, 28, 0.12)',
  header: '0 2px 8px rgba(13, 18, 28, 0.08)',
  dropdown: '0 4px 16px rgba(13, 18, 28, 0.12)',
  modal: '0 20px 40px rgba(13, 18, 28, 0.16)',
  toast: '0 4px 12px rgba(13, 18, 28, 0.15)',
  // Focus rings
  focusPrimary: '0 0 0 3px rgba(37, 147, 95, 0.25)',
  focusError: '0 0 0 3px rgba(240, 68, 56, 0.25)',
  // Inner
  inner: 'inset 0 2px 4px 0 rgba(13, 18, 28, 0.05)',
  innerSm: 'inset 0 1px 2px 0 rgba(13, 18, 28, 0.05)',
} as const;

// ============================================
// TRANSITIONS
// ============================================

export const transitions = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },
  durationMs: {
    fast: 150,
    normal: 200,
    slow: 300,
  },
  timing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    linear: 'linear',
    bounceIn: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  },
} as const;

// ============================================
// Z-INDEX
// ============================================

export const zIndex = {
  auto: 'auto',
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
  max: 9999,
} as const;

// ============================================
// BREAKPOINTS
// ============================================

export const breakpoints = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1920,
} as const;

export const breakpointsPx = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1920px',
} as const;

// ============================================
// MEDIA QUERIES
// ============================================

export const mediaQueries = {
  xs: `@media (min-width: ${breakpointsPx.xs})`,
  sm: `@media (min-width: ${breakpointsPx.sm})`,
  md: `@media (min-width: ${breakpointsPx.md})`,
  lg: `@media (min-width: ${breakpointsPx.lg})`,
  xl: `@media (min-width: ${breakpointsPx.xl})`,
  '2xl': `@media (min-width: ${breakpointsPx['2xl']})`,
  '3xl': `@media (min-width: ${breakpointsPx['3xl']})`,
  // Max-width
  maxXs: `@media (max-width: ${breakpoints.xs - 1}px)`,
  maxSm: `@media (max-width: ${breakpoints.sm - 1}px)`,
  maxMd: `@media (max-width: ${breakpoints.md - 1}px)`,
  maxLg: `@media (max-width: ${breakpoints.lg - 1}px)`,
  maxXl: `@media (max-width: ${breakpoints.xl - 1}px)`,
  // Special
  dark: '@media (prefers-color-scheme: dark)',
  light: '@media (prefers-color-scheme: light)',
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  print: '@media print',
  hover: '@media (hover: hover)',
  touch: '@media (hover: none)',
} as const;

// ============================================
// COMPLETE THEME EXPORT
// ============================================

export const theme = {
  colors,
  semanticColors,
  typography,
  spacing,
  spacingPx,
  sizing,
  sizingPx,
  borders,
  borderRadiusPx,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  breakpointsPx,
  mediaQueries,
} as const;

export type Theme = typeof theme;
export type Colors = typeof colors;
export type SemanticColors = typeof semanticColors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type Sizing = typeof sizing;
export type Borders = typeof borders;
export type Shadows = typeof shadows;
export type Transitions = typeof transitions;
export type ZIndex = typeof zIndex;
export type Breakpoints = typeof breakpoints;

export default theme;
