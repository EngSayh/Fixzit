"use client";

import { useEffect } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { useCurrency } from "@/contexts/CurrencyContext";

/**
 * Broadcasts user locale/currency preferences to non-React scripts via CustomEvent.
 *
 * **React Architecture Compliance:**
 * - This component ONLY dispatches a CustomEvent for legacy non-React scripts
 * - React components should use `useTranslation()` and `useCurrency()` hooks directly
 * - DOM manipulation (querySelectorAll, textContent) has been REMOVED
 *
 * **For React Components:**
 * ```tsx
 * // ✅ CORRECT - Use hooks
 * const { language, isRTL } = useTranslation();
 * const { currency } = useCurrency();
 *
 * // ❌ WRONG - Don't use data attributes
 * <span data-lang-text>...</span>
 * ```
 *
 * **Event Details:**
 * - Event: `fixzit:preferences`
 * - Payload: `{ language: string, currency: string, dir: 'ltr' | 'rtl' }`
 * - Target: `window`
 *
 * The component performs no rendering (returns `null`) and is a no-op on the server.
 */
export default function PreferenceBroadcast() {
  const { language, isRTL } = useTranslation();
  const { currency } = useCurrency();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // ✅ ONLY dispatch CustomEvent for non-React scripts (e.g., public/*.js, legacy HTML)
    const detail = { language, currency, dir: isRTL ? "rtl" : "ltr" };
    window.dispatchEvent(new CustomEvent("fixzit:preferences", { detail }));

    // ❌ REMOVED: DOM manipulation (querySelectorAll, textContent)
    // React components should use useTranslation() and useCurrency() hooks instead
    // If you need language/currency in a React component, import the hooks:
    //   import { useTranslation } from '@/contexts/TranslationContext';
    //   import { useCurrency } from '@/contexts/CurrencyContext';
  }, [language, currency, isRTL]);

  return null;
}
