'use client';

import { useEffect } from 'react';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { useCurrency } from '@/src/contexts/CurrencyContext';

export default function PreferenceBroadcast() {
  const { language, isRTL } = useTranslation();
  const { currency } = useCurrency();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const detail = { language, currency, dir: isRTL ? 'rtl' : 'ltr' };
    window.dispatchEvent(new CustomEvent('fixzit:preferences', { detail }));

    const langNodes = document.querySelectorAll<HTMLElement>('[data-lang-text]');
    langNodes.forEach(node => {
      node.textContent = language;
    });

    const currencyNodes = document.querySelectorAll<HTMLElement>('[data-currency-text]');
    currencyNodes.forEach(node => {
      node.textContent = currency;
    });

    const mirrorNodes = document.querySelectorAll<HTMLElement>('[data-preference-mirror]');
    mirrorNodes.forEach(node => {
      if (node.dataset.preferenceMirror === 'language') {
        node.textContent = language;
      }
      if (node.dataset.preferenceMirror === 'currency') {
        node.textContent = currency;
      }
    });
  }, [language, currency, isRTL]);

  return null;
}