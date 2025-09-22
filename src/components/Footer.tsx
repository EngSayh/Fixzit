"use client";
import Link from "next/link";
import { useState } from "react";
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Youtube, Instagram } from "lucide-react";
import SupportPopup from "@/src/components/SupportPopup";
import { useI18n } from '@/src/providers/RootProviders';

export default function Footer(){
  const [open, setOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  // Get i18n context
  const { t, isRTL } = useI18n();

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail) {
      setNewsletterSubscribed(true);
      setNewsletterEmail('');
    }
  };

  return (
    <footer className="mt-16 border-t bg-white/70 dark:bg-neutral-900/70 backdrop-blur">
      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 text-sm">
          {/* Brand & Description */}
          <div className="lg:col-span-2">
            <div className="font-bold text-lg mb-3">{t('footer.brand', 'Fixzit')}</div>
            <p className="opacity-80 mb-4 leading-relaxed">
              {t('footer.description', 'Facility management + marketplaces in one platform. Streamline operations, optimize costs, and enhance productivity with our comprehensive enterprise solution.')}
            </p>

            {/* Contact Information */}
            <div className="space-y-2 text-sm opacity-75">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>{t('footer.contact.phone', '+966 50 123 4567')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>{t('footer.contact.email', 'info@fixzit.com')}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{t('footer.contact.address', 'Riyadh, Saudi Arabia')}</span>
              </div>
            </div>
          </div>

          {/* Company Links */}
          <div>
            <div className="font-semibold mb-3">{t('footer.company', 'Company')}</div>
            <ul className="space-y-2 opacity-80">
              <li><Link href="/cms/about" className="hover:underline transition-colors">{t('footer.about', 'About')}</Link></li>
              <li><Link href="/careers" className="hover:underline transition-colors">{t('footer.careers', 'Careers')}</Link></li>
              <li><Link href="/cms/contact" className="hover:underline transition-colors">{t('footer.contact', 'Contact')}</Link></li>
              <li><Link href="/cms/partners" className="hover:underline transition-colors">{t('footer.partners', 'Partners')}</Link></li>
              <li><Link href="/cms/investors" className="hover:underline transition-colors">{t('footer.investors', 'Investors')}</Link></li>
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <div className="font-semibold mb-3">{t('footer.solutions', 'Solutions')}</div>
            <ul className="space-y-2 opacity-80">
              <li><Link href="/fm" className="hover:underline transition-colors">{t('footer.fm', 'Facility Management')}</Link></li>
              <li><Link href="/souq" className="hover:underline transition-colors">{t('footer.souq', 'Material Marketplace')}</Link></li>
              <li><Link href="/aqar" className="hover:underline transition-colors">{t('footer.aqar', 'Real Estate')}</Link></li>
              <li><Link href="/cms/integrations" className="hover:underline transition-colors">{t('footer.integrations', 'Integrations')}</Link></li>
              <li><Link href="/cms/api" className="hover:underline transition-colors">{t('footer.api', 'API Access')}</Link></li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <div className="font-semibold mb-3">{t('footer.support', 'Support')}</div>
            <ul className="space-y-2 opacity-80">
              <li><Link href="/help" className="hover:underline transition-colors">{t('footer.help', 'Help Center')}</Link></li>
              <li><Link href="/cms/documentation" className="hover:underline transition-colors">{t('footer.docs', 'Documentation')}</Link></li>
              <li><Link href="/cms/community" className="hover:underline transition-colors">{t('footer.community', 'Community')}</Link></li>
              <li><Link href="/cms/status" className="hover:underline transition-colors">{t('footer.status', 'System Status')}</Link></li>
              <li><button className="hover:underline text-left transition-colors" onClick={()=>setOpen(true)}>{t('footer.ticket', 'Open a ticket')}</button></li>
            </ul>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-8 pt-8 border-t border-gray-200/50">
          <div className="max-w-md">
            <h3 className="font-semibold mb-2">{t('footer.newsletter.title', 'Stay Updated')}</h3>
            <p className="text-sm opacity-70 mb-3">
              {t('footer.newsletter.description', 'Get the latest updates, tips, and industry insights delivered to your inbox.')}
            </p>
            {!newsletterSubscribed ? (
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder={t('footer.newsletter.placeholder', 'Enter your email')}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  {t('footer.newsletter.subscribe', 'Subscribe')}
                </button>
              </form>
            ) : (
              <div className="text-green-600 font-medium">
                {t('footer.newsletter.success', 'Thank you for subscribing!')}
              </div>
            )}
          </div>
        </div>

        {/* Social Media Links */}
        <div className="mt-6 flex flex-wrap gap-4">
          <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors" aria-label="Facebook">
            <Facebook className="w-5 h-5" />
          </a>
          <a href="#" className="text-gray-600 hover:text-blue-400 transition-colors" aria-label="Twitter">
            <Twitter className="w-5 h-5" />
          </a>
          <a href="#" className="text-gray-600 hover:text-blue-700 transition-colors" aria-label="LinkedIn">
            <Linkedin className="w-5 h-5" />
          </a>
          <a href="#" className="text-gray-600 hover:text-red-600 transition-colors" aria-label="YouTube">
            <Youtube className="w-5 h-5" />
          </a>
          <a href="#" className="text-gray-600 hover:text-pink-600 transition-colors" aria-label="Instagram">
            <Instagram className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-200/50">
        <div className="mx-auto max-w-7xl px-4 lg:px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs opacity-60">
            <div>
              © {new Date().getFullYear()} {t('footer.copyright', 'Fixzit. All rights reserved.')}
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href="/cms/privacy" className="hover:underline transition-colors">{t('footer.privacy', 'Privacy')}</Link>
              <Link href="/cms/terms" className="hover:underline transition-colors">{t('footer.terms', 'Terms')}</Link>
              <Link href="/cms/cookies" className="hover:underline transition-colors">{t('footer.cookies', 'Cookies')}</Link>
              <Link href="/cms/accessibility" className="hover:underline transition-colors">{t('footer.accessibility', 'Accessibility')}</Link>
              <Link href="/cms/sitemap" className="hover:underline transition-colors">{t('footer.sitemap', 'Sitemap')}</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Support Popup */}
      {open && <SupportPopup onClose={()=>setOpen(false)} />}
    </footer>
  );
}