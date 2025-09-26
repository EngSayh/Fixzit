"use client";
import Link from "next/link";
import { useState } from "react";
import { Home } from "lucide-react";
import SupportPopup from "@/src/components/SupportPopup";
import { useTranslation } from &apos;@/src/contexts/TranslationContext&apos;;
import LanguageSelector from &apos;@/src/components/i18n/LanguageSelector&apos;;
import CurrencySelector from &apos;@/src/components/i18n/CurrencySelector&apos;;
import { useCurrency, CURRENCY_OPTIONS } from &apos;@/src/contexts/CurrencyContext&apos;;

export default function Footer() {
  const [open, setOpen] = useState(false);
  const { currency } = useCurrency();
  const currentCurrency = CURRENCY_OPTIONS.find(option => option.code === currency) ?? CURRENCY_OPTIONS[0];

  // Safe translation with fallback
  let t: (key: string, fallback?: string) => string;
  let translationIsRTL: boolean = false;
  try {
    const translationContext = useTranslation();
    t = translationContext.t;
    translationIsRTL = translationContext.isRTL;
  } catch {
    // Fallback translation function
    t = (key: string, fallback?: string) => fallback || key;
    translationIsRTL = false;
  }

  return (
    <footer className="mt-16 border-t bg-white/70 dark:bg-neutral-900/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-6 space-y-6 text-sm">
        <div className={`flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${translationIsRTL ? &apos;text-right&apos; : &apos;'}`}>
          <Link href="/" className="inline-flex items-center gap-2 text-[#0061A8] hover:text-[#004f86]">
            <Home className="h-4 w-4" />
            <span>{t(&apos;footer.backHome&apos;, &apos;Back to Home&apos;)}</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSelector variant="compact" />
            <CurrencySelector variant="compact" />
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <span aria-hidden>{currentCurrency.flag}</span>
              <span>{currentCurrency.code}</span>
              <span className="text-gray-400">({currentCurrency.symbol})</span>
            </span>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4 text-sm">
          <div>
            <div className="font-semibold mb-2">{t(&apos;footer.brand&apos;, &apos;Fixzit&apos;)}</div>
            <p className="opacity-70">{t(&apos;footer.description&apos;, &apos;Facility management + marketplaces in one platform.&apos;)}</p>
          </div>
          <div>
            <div className="font-semibold mb-2">{t(&apos;footer.company&apos;, &apos;Company&apos;)}</div>
            <ul className="space-y-1 opacity-80">
              <li><Link href="/cms/about" className="hover:underline">{t(&apos;footer.about&apos;, &apos;About&apos;)}</Link></li>
              <li><Link href="/careers" className="hover:underline">{t(&apos;footer.careers&apos;, &apos;Careers&apos;)}</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">{t(&apos;footer.legal&apos;, &apos;Legal&apos;)}</div>
            <ul className="space-y-1 opacity-80">
              <li><Link href="/cms/privacy" className="hover:underline">{t(&apos;footer.privacy&apos;, &apos;Privacy&apos;)}</Link></li>
              <li><Link href="/cms/terms" className="hover:underline">{t(&apos;footer.terms&apos;, &apos;Terms&apos;)}</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">{t(&apos;footer.support&apos;, &apos;Support&apos;)}</div>
            <ul className="space-y-1 opacity-80">
              <li><Link href="/help" className="hover:underline">{t(&apos;footer.help&apos;, &apos;Help Center&apos;)}</Link></li>
              <li><button className="hover:underline text-left" onClick={()=>setOpen(true)}>{t(&apos;footer.ticket&apos;, &apos;Open a ticket&apos;)}</button></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-black/5 pt-4 text-xs opacity-60 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} {t(&apos;footer.copyright&apos;, &apos;Fixzit. All rights reserved.&apos;)}</div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/support" className="hover:underline">Support</Link>
          </div>
        </div>
      </div>
      {open && <SupportPopup onClose={() => setOpen(false)} />}
    </footer>
  );
}
