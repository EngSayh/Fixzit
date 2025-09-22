"use client";
import Link from "next/link";
import { useState } from "react";
import SupportPopup from "@/src/components/SupportPopup";
import { useTranslation } from '@/src/contexts/TranslationContext';

export default function Footer(){
  const [open,setOpen]=useState(false);

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
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-10 grid gap-6 sm:grid-cols-2 md:grid-cols-4 text-sm">
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
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-4 text-xs opacity-60">
        © {new Date().getFullYear()} {t('footer.copyright', 'Fixzit. All rights reserved.')}
      </div>
      {open && <SupportPopup onClose={()=>setOpen(false)} />}
    </footer>
  );
}