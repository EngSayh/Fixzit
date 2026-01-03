/**
 * Centralized Brand Color Configuration
 *
 * This file contains all brand colors for the Ejar.sa design system.
 * Based on Saudi Arabia's official "Platforms Code" (كود المنصات) national design system.
 * Use these constants instead of hardcoding hex values throughout the codebase.
 *
 * @module lib/config/brand-colors
 * @see docs/BRANDING.md for usage guidelines
 */

/**
 * Ejar.sa Primary Color Scale (Official Platforms Code)
 *
 * Primary green derived from Saudi national colors with platform-specific variations.
 */
export const PRIMARY_SCALE = {
  50: "#E8F7EE",
  100: "#C7EAD8",
  200: "#8FD4B1",
  300: "#5FBD8E",
  400: "#3BA874",
  500: "#25935F", // Main brand color
  600: "#188352", // Hover state
  700: "#166A45", // Active/pressed state
  800: "#0F5535",
  900: "#0A3D26",
  950: "#052918",
} as const;

/**
 * Neutral/Gray Scale (Official Platforms Code)
 */
export const NEUTRAL_SCALE = {
  50: "#F9FAFB",
  100: "#F3F4F6",
  200: "#E5E7EB",
  300: "#CFD4DB",
  400: "#A8AEB8",
  500: "#8A919C",
  600: "#6C737F",
  700: "#434B5A",
  800: "#2D3340",
  900: "#1A1F2B",
  950: "#0D121C",
} as const;

/**
 * Ejar.sa Primary Brand Colors
 *
 * These colors should be used for:
 * - Primary buttons and CTAs
 * - Links and interactive elements
 * - Accent highlights
 * - Brand identity elements
 */
export const BRAND_COLORS = {
  /** Primary Ejar Green - main brand color (primary-500) */
  primary: "#25935F",

  /** Hover state (primary-600) */
  primaryHover: "#188352",

  /** Active/pressed state (primary-700) */
  primaryDark: "#166A45",

  /** Light green surface - backgrounds (primary-50) */
  primaryLight: "#E8F7EE",

  /** Secondary gold - highlights, badges */
  secondary: "#F5BD02",

  /** Secondary gold hover */
  secondaryHover: "#D4A302",

  /** Lavender accent */
  lavender: "#80519F",

  /** Saudi National Green (for official government contexts) */
  saudiGreen: "#006C35",

  /** Success green */
  success: "#17B26A",

  /** Success light background */
  successLight: "#ECFDF5",

  /** Warning amber */
  warning: "#F79009",

  /** Warning light background */
  warningLight: "#FFFAEB",

  /** Error/Destructive red */
  error: "#F04438",

  /** Error light background */
  errorLight: "#FEF3F2",

  /** Info blue */
  info: "#2E90FA",

  /** Info light background */
  infoLight: "#EFF8FF",
} as const;

/**
 * Neutral Colors for text and backgrounds
 */
export const NEUTRAL_COLORS = {
  /** Primary text color (neutral-950) */
  textPrimary: "#0D121C",

  /** Headings (neutral-900) */
  textHeading: "#1A1F2B",

  /** Secondary text color (neutral-700) */
  textSecondary: "#434B5A",

  /** Muted/tertiary text (neutral-600) */
  textMuted: "#6C737F",

  /** Placeholder text (neutral-500) */
  textPlaceholder: "#8A919C",

  /** Page background (neutral-50) */
  backgroundPage: "#F9FAFB",

  /** Card background (neutral-100) */
  backgroundCard: "#F3F4F6",

  /** White */
  white: "#FFFFFF",

  /** Dark background - footer, sidebar (neutral-950) */
  backgroundDark: "#0D121C",

  /** Borders (neutral-200) */
  border: "#E5E7EB",

  /** Light borders (neutral-300) */
  borderLight: "#CFD4DB",
} as const;

/**
 * Email Template Colors
 *
 * These colors are used in transactional email templates.
 * They should be inline-safe (no CSS variables) and accessible.
 */
export const EMAIL_COLORS = {
  /** Primary CTA button background */
  ctaBackground: BRAND_COLORS.primary,

  /** CTA button text */
  ctaText: NEUTRAL_COLORS.white,

  /** Email header background */
  headerBackground: BRAND_COLORS.primary,

  /** Email body background */
  bodyBackground: NEUTRAL_COLORS.backgroundPage,

  /** Primary text in emails */
  textPrimary: NEUTRAL_COLORS.textPrimary,

  /** Secondary text in emails */
  textSecondary: NEUTRAL_COLORS.textSecondary,

  /** Link color */
  linkColor: BRAND_COLORS.primary,

  /** Success message color */
  success: BRAND_COLORS.success,

  /** Error/warning message color */
  error: BRAND_COLORS.error,
} as const;

/**
 * PDF Generation Colors
 *
 * Colors used in PDF documents (invoices, offers, reports).
 */
export const PDF_COLORS = {
  /** Header background */
  headerBackground: BRAND_COLORS.primary,

  /** Header text */
  headerText: NEUTRAL_COLORS.white,

  /** Primary accent */
  accent: BRAND_COLORS.primary,

  /** Table header */
  tableHeader: BRAND_COLORS.primaryDark,

  /** Table row alternate */
  tableRowAlt: NEUTRAL_COLORS.backgroundCard,
} as const;

/**
 * Chart/Analytics Colors
 *
 * Color palette for data visualization.
 */
export const CHART_COLORS = {
  /** Primary data series */
  series1: BRAND_COLORS.primary,

  /** Secondary data series */
  series2: BRAND_COLORS.secondary,

  /** Tertiary data series */
  series3: BRAND_COLORS.primaryDark,

  /** Quaternary data series */
  series4: "#8b5cf6", // Purple

  /** Quinary data series */
  series5: "#ec4899", // Pink

  /** Default palette array for charts */
  palette: [
    BRAND_COLORS.primary,
    BRAND_COLORS.secondary,
    BRAND_COLORS.primaryDark,
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#6366f1",
  ],
} as const;

/**
 * 3D Rendering Colors
 *
 * Colors used in Three.js 3D components (BuildingViewer, etc.).
 * These are rendering engine values, not brand colors.
 */
export const RENDERING_COLORS = {
  /** No emissive light (black) */
  emissiveOff: "#000000",

  /** Full emissive light when selected (white) */
  emissiveOn: "#ffffff",

  /** Slight emissive glow when hovered/selected */
  emissiveHover: "#222222",

  /** Floor/ground plane color */
  floorPlane: "#e5e7eb",
} as const;

/**
 * Legacy Colors (DEPRECATED)
 *
 * These colors are from the old brown/amber theme.
 * DO NOT USE - kept for reference during migration only.
 *
 * @deprecated Use BRAND_COLORS instead
 */
export const LEGACY_COLORS = {
  /** @deprecated Old primary brown */
  primaryBrown: "#B46B2F",

  /** @deprecated Old accent amber */
  accentAmber: "#D68B4A",
} as const;

/**
 * Get CSS variable compatible color string
 *
 * @param color - Hex color from constants
 * @returns CSS-safe color string
 */
export function cssColor(color: string): string {
  return color;
}

/**
 * Convert hex to RGB for email templates
 *
 * @param hex - Hex color code
 * @returns RGB values object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export type BrandColor = keyof typeof BRAND_COLORS;
export type NeutralColor = keyof typeof NEUTRAL_COLORS;
export type EmailColor = keyof typeof EMAIL_COLORS;
