/**
 * Centralized Brand Color Configuration
 *
 * This file contains all brand colors for the Business.sa rebrand (2025).
 * Use these constants instead of hardcoding hex values throughout the codebase.
 *
 * @module lib/config/brand-colors
 * @see docs/BRANDING.md for usage guidelines
 */

/**
 * Business.sa Primary Brand Colors
 *
 * These colors should be used for:
 * - Primary buttons and CTAs
 * - Links and interactive elements
 * - Accent highlights
 * - Brand identity elements
 */
export const BRAND_COLORS = {
  /** Primary blue - main brand color */
  primary: "#0061A8",

  /** Dark blue - headers, sidebar, footer */
  primaryDark: "#1a365d",

  /** Light blue - hover states, backgrounds */
  primaryLight: "#e6f0f7",

  /** Secondary blue - supporting elements */
  secondary: "#0e7490",

  /** Accent teal - call-to-actions, highlights */
  accent: "#00c4cc",

  /** Success green */
  success: "#22c55e",

  /** Warning amber */
  warning: "#f97316",

  /** Error/Destructive red */
  error: "#dc2626",

  /** Info blue */
  info: "#0070f3",
} as const;

/**
 * Neutral Colors for text and backgrounds
 */
export const NEUTRAL_COLORS = {
  /** Primary text color */
  textPrimary: "#1a1a1a",

  /** Secondary text color */
  textSecondary: "#666666",

  /** Muted/tertiary text */
  textMuted: "#999999",

  /** Light background */
  backgroundLight: "#f9f9f9",

  /** White */
  white: "#ffffff",

  /** Dark background (for dark mode) */
  backgroundDark: "#0f172a",
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
  bodyBackground: NEUTRAL_COLORS.backgroundLight,

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
  tableRowAlt: NEUTRAL_COLORS.backgroundLight,
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
  series3: BRAND_COLORS.accent,

  /** Quaternary data series */
  series4: "#8b5cf6", // Purple

  /** Quinary data series */
  series5: "#ec4899", // Pink

  /** Default palette array for charts */
  palette: [
    BRAND_COLORS.primary,
    BRAND_COLORS.secondary,
    BRAND_COLORS.accent,
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#6366f1",
  ],
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
