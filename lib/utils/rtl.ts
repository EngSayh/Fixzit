/**
 * RTL (Right-to-Left) Utility Functions
 * Provides helpers for RTL-aware styling and layout
 *
 * @deprecated MIGRATION NOTICE (2025-12-08):
 * Prefer Tailwind CSS logical properties over these utilities:
 * - Use `text-start` / `text-end` instead of `text-left` / `text-right`
 * - Use `ps-*` / `pe-*` instead of `pl-*` / `pr-*` (padding)
 * - Use `ms-*` / `me-*` instead of `ml-*` / `mr-*` (margin)
 * - Use `start-*` / `end-*` instead of `left-*` / `right-*` (positioning)
 * - Use `rounded-s-*` / `rounded-e-*` instead of `rounded-l-*` / `rounded-r-*`
 *
 * These utilities remain for legacy code that cannot use logical properties.
 * New components should use Tailwind logical classes directly.
 *
 * @see https://tailwindcss.com/docs/logical-properties
 */

/**
 * Returns RTL-aware directional class names
 * @param isRTL - Whether the current locale is RTL
 * @returns Object with directional class utilities
 * @deprecated Use Tailwind logical properties (text-start, ps-*, ms-*, etc.) instead
 */
export function getRTLClasses(isRTL: boolean) {
  return {
    // Text alignment
    textStart: isRTL ? "text-right" : "text-left",
    textEnd: isRTL ? "text-left" : "text-right",

    // Margins
    ms: (size: string) => (isRTL ? `mr-${size}` : `ml-${size}`), // margin-start
    me: (size: string) => (isRTL ? `ml-${size}` : `mr-${size}`), // margin-end

    // Padding
    ps: (size: string) => (isRTL ? `pr-${size}` : `pl-${size}`), // padding-start
    pe: (size: string) => (isRTL ? `pl-${size}` : `pr-${size}`), // padding-end

    // Positioning
    start: (value: string) => (isRTL ? `right-${value}` : `left-${value}`),
    end: (value: string) => (isRTL ? `left-${value}` : `right-${value}`),

    // Flex direction
    flexRow: isRTL ? "flex-row-reverse" : "flex-row",

    // Float
    floatStart: isRTL ? "float-right" : "float-left",
    floatEnd: isRTL ? "float-left" : "float-right",

    // Border radius
    roundedStart: isRTL ? "rounded-r" : "rounded-l",
    roundedEnd: isRTL ? "rounded-l" : "rounded-r",

    // Direction attribute
    dir: isRTL ? "rtl" : "ltr",
  };
}

/**
 * Conditionally applies RTL classes
 * @param isRTL - Whether the current locale is RTL
 * @param rtlClass - Class to apply when RTL
 * @param ltrClass - Class to apply when LTR (optional, defaults to empty)
 */
export function rtlClass(
  isRTL: boolean,
  rtlClass: string,
  ltrClass: string = "",
) {
  return isRTL ? rtlClass : ltrClass;
}

/**
 * Converts hardcoded directional classes to RTL-aware ones
 * @param className - Original class string
 * @param isRTL - Whether the current locale is RTL
 */
export function makeRTL(className: string, isRTL: boolean): string {
  if (!isRTL) return className;

  return (
    className
      // Margins
      .replace(/\bml-(\d+|auto|px)\b/g, "mr-$1")
      .replace(/\bmr-(\d+|auto|px)\b/g, "ml-$1")
      // Padding
      .replace(/\bpl-(\d+|auto|px)\b/g, "pr-$1")
      .replace(/\bpr-(\d+|auto|px)\b/g, "pl-$1")
      // Text alignment
      .replace(/\btext-left\b/g, "text-right")
      .replace(/\btext-right\b/g, "text-left")
      // Float
      .replace(/\bfloat-left\b/g, "float-right")
      .replace(/\bfloat-right\b/g, "float-left")
      // Positioning
      .replace(/\bleft-(\d+|auto)\b/g, "right-$1")
      .replace(/\bright-(\d+|auto)\b/g, "left-$1")
      // Border radius
      .replace(/\brounded-l\b/g, "rounded-r")
      .replace(/\brounded-r\b/g, "rounded-l")
      .replace(/\brounded-tl\b/g, "rounded-tr")
      .replace(/\brounded-tr\b/g, "rounded-tl")
      .replace(/\brounded-bl\b/g, "rounded-br")
      .replace(/\brounded-br\b/g, "rounded-bl")
  );
}

/**
 * Hook-friendly helper to get RTL-aware class string
 * Usage: const cls = useRTLClass('ml-4 text-left', isRTL);
 */
export function useRTLClass(className: string, isRTL: boolean): string {
  return makeRTL(className, isRTL);
}

/**
 * Generates icon flip transformation for RTL
 * Icons with directional meaning (arrows, chevrons) should flip in RTL
 */
export function flipIconRTL(isRTL: boolean): string {
  return isRTL ? "scale-x-[-1]" : "";
}

/**
 * Returns appropriate flex direction for RTL
 */
export function flexDirectionRTL(
  isRTL: boolean,
  reverse: boolean = false,
): string {
  if (reverse) {
    return isRTL ? "flex-row" : "flex-row-reverse";
  }
  return isRTL ? "flex-row-reverse" : "flex-row";
}
