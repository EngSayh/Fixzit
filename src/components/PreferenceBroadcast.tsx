'use client&apos;;

import { useEffect } from &apos;react&apos;;
import { useTranslation } from &apos;@/src/contexts/TranslationContext&apos;;
import { useCurrency } from &apos;@/src/contexts/CurrencyContext&apos;;

export default function PreferenceBroadcast() {
  const { language, locale, isRTL } = useTranslation();
  const { currency } = useCurrency();

  useEffect(() => {
    if (typeof window === &apos;undefined&apos;) {
      return;
    }

    const detail = { language, locale, currency, dir: isRTL ? &apos;rtl&apos; : &apos;ltr&apos; };
    window.dispatchEvent(new CustomEvent(&apos;fixzit:preferences&apos;, { detail }));

    const langNodes = document.querySelectorAll<HTMLElement>(&apos;[data-lang-text]&apos;);
    langNodes.forEach(node => {
      node.textContent = locale;
    });

    const currencyNodes = document.querySelectorAll<HTMLElement>(&apos;[data-currency-text]&apos;);
    currencyNodes.forEach(node => {
      node.textContent = currency;
    });

    const mirrorNodes = document.querySelectorAll<HTMLElement>(&apos;[data-preference-mirror]&apos;);
    mirrorNodes.forEach(node => {
      if (node.dataset.preferenceMirror === &apos;language&apos;) {
        node.textContent = locale;
      }
      if (node.dataset.preferenceMirror === &apos;currency&apos;) {
        node.textContent = currency;
      }
    });
  }, [language, locale, currency, isRTL]);

  return null;
}
