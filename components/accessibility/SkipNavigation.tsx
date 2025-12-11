"use client";

import { useTranslation } from "@/contexts/TranslationContext";

/**
 * Skip Navigation Link for accessibility (WCAG 2.1 AA compliant).
 * Allows keyboard users to skip directly to main content.
 * Only visible when focused via keyboard (Tab key).
 *
 * @accessibility
 * - Screen reader accessible
 * - Keyboard navigable (Tab to reveal, Enter to activate)
 * - High contrast focus state (4.5:1 ratio)
 * - RTL-aware positioning (uses `start` instead of `left`)
 */
export default function SkipNavigation() {
  const { t } = useTranslation();

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      aria-label={t("accessibility.skipToMainContent", "Skip to main content")}
    >
      {t("accessibility.skipToMainContent", "Skip to main content")}
    </a>
  );
}
