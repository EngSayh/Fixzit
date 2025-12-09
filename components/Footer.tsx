'use client';
"use client";
import React from "react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Home } from "lucide-react";
import SupportPopup from "@/components/SupportPopup";
import { useTranslation } from "@/contexts/TranslationContext";
import LanguageSelector from "@/components/i18n/LanguageSelector";
import CurrencySelector from "@/components/i18n/CurrencySelector";

/**
 * Responsive site footer component with company, legal, and support links.
 *
 * Features:
 * - Brand identity with "Back to Home" link
 * - Language and currency selectors (compact variants)
 * - Multi-column link grid (Company, Legal, Support)
 * - Support ticket popup integration
 * - Full RTL support with flex-row-reverse for proper layout mirroring
 * - Theme-consistent colors using Tailwind's brand color classes
 * - Accessibility-ready with semantic HTML
 *
 * RTL Enhancements:
 * - Uses flex-row-reverse for proper element ordering in RTL
 * - Text alignment respects reading direction
 * - Maintains visual hierarchy in both LTR and RTL modes
 *
 * @returns {JSX.Element} The footer JSX element.
 */
export default function Footer() {
  const [open, setOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState("");

  // Use the translation context directly - it has its own fallback
  const { t, isRTL: translationIsRTL } = useTranslation();

  // Client-side hydration for current year to avoid SSR mismatch
  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
  }, []);

  return (
    <footer className="border-t bg-card/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-6 space-y-6 text-sm">
        <div
          className={`flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${translationIsRTL ? "md:flex-row-reverse" : ""}`}
        >
          <div className="font-semibold mb-2">
            {t("footer.brand", "Fixzit")}
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-primary hover:text-primary dark:text-primary/80 dark:hover:text-primary/60"
          >
            <Home className="h-4 w-4" />
            <span>{t("footer.backHome", "Back to Home")}</span>
          </Link>
          <div
            className={`flex items-center gap-3 ${translationIsRTL ? "flex-row-reverse" : ""}`}
          >
            <LanguageSelector variant="compact" />
            <CurrencySelector variant="compact" />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4 text-sm">
          <div>
            <div className="font-semibold mb-2">
              {t("footer.company", "Company")}
            </div>
            <ul className="space-y-1 opacity-80">
              <li>
                <Link href="/about" className="hover:underline">
                  {t("footer.about", "About")}
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:underline">
                  {t("footer.careers", "Careers")}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:underline">
                  {t("footer.pricing", "Pricing & Trial")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">
              {t("footer.legal", "Legal")}
            </div>
            <ul className="space-y-1 opacity-80">
              <li>
                <Link href="/privacy" className="hover:underline">
                  {t("footer.privacy", "Privacy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:underline">
                  {t("footer.terms", "Terms")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">
              {t("footer.support", "Support")}
            </div>
            <ul className="space-y-1 opacity-80">
              <li>
                <Link href="/help" className="hover:underline">
                  {t("footer.help", "Help Center")}
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  className="hover:underline text-start"
                  onClick={() => setOpen(true)}
                >
                  {t("footer.ticket", "Open a ticket")}
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-4 text-xs opacity-80 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div>
              © {currentYear || "..."}{" "}
              {t("footer.copyright", "Fixzit. All rights reserved.")}
            </div>
            <nav
              aria-label={t("footer.breadcrumbLabel", "Fixzit trail")}
              className={`flex flex-wrap items-center gap-2 text-[11px] ${translationIsRTL ? "flex-row-reverse" : ""}`}
            >
              <span>{t("footer.crumb.fixzit", "Fixzit")}</span>
              <span aria-hidden>›</span>
              <span>{t("footer.crumb.platform", "Design System")}</span>
              <span aria-hidden>›</span>
              <span>{t("footer.crumb.version", "v2")}</span>
            </nav>
          </div>
          <div
            className={`flex gap-4 ${translationIsRTL ? "flex-row-reverse" : ""}`}
          >
            <Link href="/privacy" className="hover:underline">
              {t("footer.privacy", "Privacy")}
            </Link>
            <Link href="/terms" className="hover:underline">
              {t("footer.terms", "Terms")}
            </Link>
            <Link href="/support" className="hover:underline">
              {t("footer.support", "Support")}
            </Link>
          </div>
        </div>
      </div>
      {open && <SupportPopup open={open} onClose={() => setOpen(false)} />}
    </footer>
  );
}
