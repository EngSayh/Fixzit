"use client";
import Link from "next/link";
import { useState } from "react";
import { Home } from "lucide-react";
import SupportPopup from "@/src/components/SupportPopup";
import { useTranslation } from '@/src/contexts/TranslationContext';
import LanguageSelector from '@/src/components/LanguageSelector';
import CurrencySelector from '@/src/components/i18n/CurrencySelector';
import { useCurrency, CURRENCY_OPTIONS } from '@/src/contexts/CurrencyContext';

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
        <div className={`flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${translationIsRTL ? 'text-right' : ''}`}>
          <Link href="/" className="inline-flex items-center gap-2 text-[#0061A8] hover:text-[#004f86]">
            <Home className="h-4 w-4" />
            <span>{t('footer.backHome', 'Back to Home')}</span>
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
            <div className="font-semibold mb-2">{t('footer.brand', 'Fixzit')}</div>
            <p className="opacity-70">{t('footer.description', 'Facility management + marketplaces in one platform.')}</p>
          </div>
          <div>
            <div className="font-semibold mb-2">{t('footer.company', 'Company')}</div>
            <ul className="space-y-1 opacity-80">
              <li><Link href="/cms/about" className="hover:underline">{t('footer.about', 'About')}</Link></li>
              <li><Link href="/careers" className="hover:underline">{t('footer.careers', 'Careers')}</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">{t('footer.legal', 'Legal')}</div>
            <ul className="space-y-1 opacity-80">
              <li><Link href="/cms/privacy" className="hover:underline">{t('footer.privacy', 'Privacy')}</Link></li>
              <li><Link href="/cms/terms" className="hover:underline">{t('footer.terms', 'Terms')}</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">{t('footer.support', 'Support')}</div>
            <ul className="space-y-1 opacity-80">
              <li><Link href="/help" className="hover:underline">{t('footer.help', 'Help Center')}</Link></li>
              <li><button className="hover:underline text-left" onClick={()=>setOpen(true)}>{t('footer.ticket', 'Open a ticket')}</button></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-black/5 pt-4 text-xs opacity-60 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} {t('footer.copyright', 'Fixzit. All rights reserved.')}</div>
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
