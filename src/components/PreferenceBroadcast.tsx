'use client';

import { useEffect } from 'react';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { useCurrency } from '@/src/contexts/CurrencyContext';

/**
 * Broadcasts user locale/currency preferences to the page and mirrors them into DOM nodes.
 *
 * Runs only in the browser: reads language, locale, and isRTL from the translation context and currency from the currency context, then dispatches a global `CustomEvent` named `fixzit:preferences` with a detail object `{ language, locale, currency, dir }`. After dispatching, it updates matching DOM nodes:
 * - elements with `data-lang-text` get their `textContent` set to `locale`
 * - elements with `data-currency-text` get their `textContent` set to `currency`
 * - elements with `data-preference-mirror="language"` or `"currency"` are set to `locale` or `currency` respectively
 *
 * The component performs no rendering (returns `null`) and is a no-op on the server (`window` is undefined).
 */
export default function PreferenceBroadcast() {
  const { language, locale, isRTL } = useTranslation();
  const { currency } = useCurrency();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const detail = { language, locale, currency, dir: isRTL ? 'rtl' : 'ltr' };
    window.dispatchEvent(new CustomEvent('fixzit:preferences', { detail }));

    const langNodes = document.querySelectorAll<HTMLElement>('[data-lang-text]');
    langNodes.forEach(node => {
      node.textContent = locale;
    });

    const currencyNodes = document.querySelectorAll<HTMLElement>('[data-currency-text]');
    currencyNodes.forEach(node => {
      node.textContent = currency;
    });

    const mirrorNodes = document.querySelectorAll<HTMLElement>('[data-preference-mirror]');
    mirrorNodes.forEach(node => {
      if (node.dataset.preferenceMirror === 'language') {
        node.textContent = locale;
      }
      if (node.dataset.preferenceMirror === 'currency') {
        node.textContent = currency;
      }
    });
  }, [language, locale, currency, isRTL]);

  return null;
}