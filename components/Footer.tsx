"use client";
import Link from "next/link";
import { useState } from "react";
import { Home } from "lucide-react";
import SupportPopup from "@/components/SupportPopup";
import { useTranslation } from '@/contexts/TranslationContext';
import LanguageSelector from '@/components/i18n/LanguageSelector';
import CurrencySelector from '@/components/i18n/CurrencySelector';

/**
 * Responsive site footer component with company, legal, and support links.
 *
 * Renders branding, a "Back to Home" link, language and currency selectors (compact variants),
 * a current currency display, and a multi-column link grid (Company, Legal, Support).
 * The "Open a ticket" button toggles an internal `open` state to show the SupportPopup.
 * Translation is sourced from the translation context with a safe fallback (`t(key, fallback)`),
 * and layout alignment supports RTL via the translation context's `isRTL` flag.
 *
 * @returns {JSX.Element} The footer JSX element.
 */
export default function Footer() {
  const [open, setOpen] = useState(false);

  // Use the translation context directly - it has its own fallback
  const { t, isRTL: translationIsRTL } = useTranslation();

  return (
    <footer className="mt-16 border-t bg-white/70 dark:bg-neutral-900/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-6 space-y-6 text-sm">
        <div className={`flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${translationIsRTL ? 'text-right' : ''}`}>
          <div className="font-semibold mb-2">{t('footer.brand', 'Fixzit')}</div>
          <Link href="/" className="inline-flex items-center gap-2 text-[#0061A8] hover:text-[#004f86]">
            <Home className="h-4 w-4" />
            <span>{t('footer.backHome', 'Back to Home')}</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSelector variant="compact" />
            <CurrencySelector variant="compact" />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4 text-sm">
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
              <li>
                <button
                  type="button"
                  className={`hover:underline ${translationIsRTL ? 'text-right' : 'text-left'}`}
                  onClick={() => setOpen(true)}
                >
                  {t('footer.ticket', 'Open a ticket')}
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-black/5 pt-4 text-xs opacity-60 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} {t('footer.copyright', 'Fixzit. All rights reserved.')}</div>
          <div className="flex gap-4">
            <Link href="/cms/privacy" className="hover:underline">{t('footer.privacy', 'Privacy')}</Link>
            <Link href="/cms/terms" className="hover:underline">{t('footer.terms', 'Terms')}</Link>
            <Link href="/support" className="hover:underline">{t('footer.support', 'Support')}</Link>
          </div>
        </div>
      </div>
      {open && <SupportPopup onClose={()=>setOpen(false)} />}
    </footer>
  );
}
