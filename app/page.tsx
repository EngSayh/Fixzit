'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/src/providers/RootProviders';
import { ArrowRight, Building2, Wrench, FileText, DollarSign, Users, ShoppingBag } from 'lucide-react';

/**
 * Client React component that renders the application's landing page.
 *
 * Renders a multi-section marketing layout (hero with CTAs, a features/modules grid driven by a modules array, a marketplaces strip, and a CTA banner). Text is localized through the `useI18n` hook (`t`, `language`, `isRTL`) and icons/colors for feature cards are driven from the `modules` configuration within the component.
 *
 * @returns The landing page JSX element.
 */
export default function LandingPage() {
  const { t, language, isRTL } = useI18n();

  const modules = [
    {
      icon: Wrench,
      title: t('modules.workOrders.title', 'Work Orders'),
      desc: t('modules.workOrders.desc', 'Dispatch, SLAs, photos, chat, and technician app.'),
      color: 'text-[#0061A8]',
      bgColor: 'bg-[#0061A8]/10'
    },
    {
      icon: Building2,
      title: t('modules.properties.title', 'Properties'),
      desc: t('modules.properties.desc', 'Units, assets, leases, owners and statements.'),
      color: 'text-[#00A859]',
      bgColor: 'bg-[#00A859]/10'
    },
    {
      icon: DollarSign,
      title: t('modules.finance.title', 'Finance'),
      desc: t('modules.finance.desc', 'Invoices, ZATCA QR, receipts, vendor payables.'),
      color: 'text-[#FFB400]',
      bgColor: 'bg-[#FFB400]/10'
    },
    {
      icon: Users,
      title: t('modules.crm.title', 'CRM'),
      desc: t('modules.crm.desc', 'Tickets, CSAT, campaigns, WhatsApp and email.'),
      color: 'text-[#F6851F]',
      bgColor: 'bg-[#F6851F]/10'
    },
    {
      icon: Building2,
      title: t('modules.aqarSouq.title', 'Aqar Souq'),
      desc: t('modules.aqarSouq.desc', 'Real estate catalog; viewable public pins, login to act.'),
      color: 'text-[#0061A8]',
      bgColor: 'bg-[#0061A8]/10'
    },
    {
      icon: ShoppingBag,
      title: t('modules.fixzitSouq.title', 'Fixzit Souq'),
      desc: t('modules.fixzitSouq.desc', 'Materials & services marketplace with 5% margin logic.'),
      color: 'text-[#00A859]',
      bgColor: 'bg-[#00A859]/10'
    }
  ];

  return (
    <>
      {/* Hero Section with Gradient Overlay */}
      <section className="relative min-h-[600px] overflow-hidden pt-14">
        {/* Brand Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0061A8] via-[#00A859] to-[#FFB400]"></div>
        {/* Subtle overlay pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.12),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.10),transparent_45%),radial-gradient(circle_at_40%_80%,rgba(255,255,255,0.08),transparent_40%)]"></div>
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl text-white">
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight drop-shadow-lg mb-6">
              {t('hero.title', 'Operate properties flawlessly. Monetize services smartly.')}
            </h1>
            <p className="text-lg md:text-xl opacity-95 mb-8">
              {t('hero.subtitle', 'Fixzit unifies Facility Management, Work Orders, Finance, CRM, and two marketplaces (Aqar Souq & Fixzit Souq) in one modern platform.')}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                href="/fm" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#0061A8] font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                {t('cta.getStarted', 'Get Started')}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                href="/souq" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white border border-white/40 font-semibold rounded-xl hover:bg-white/20 transition-all"
              >
                {t('cta.viewMarket', 'View Marketplaces')}
                <ShoppingBag className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Grid Section */}
      <section id="modules" className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-[#023047] mb-4">
              {t('modules.title', 'Everything your FM operation needs — connected')}
            </h2>
            <p className="text-lg text-gray-600">
              {t('modules.subtitle', 'Modular, role-based, Arabic/English, and mobile-ready from day one.')}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module, index) => {
              const Icon = module.icon;
              return (
                <article 
                  key={index} 
                  className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all group"
                >
                  <div className={`inline-flex p-3 rounded-xl ${module.bgColor} mb-4`}>
                    <Icon className={`w-6 h-6 ${module.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-[#023047] mb-2 group-hover:text-[#0061A8] transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-gray-600">
                    {module.desc}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Marketplaces Strip */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-[#023047]">{t('actions.souq','Souq')} & {t('modules.aqarSouq.title','Aqar Souq')}</h2>
            <Link href="/marketplace" className="text-[#0061A8] hover:underline font-medium">{t('cta.viewMarket','View Marketplaces')} →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/marketplace/properties" className="group rounded-2xl border bg-white p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[#0061A8]/10">
                  <Building2 className="w-7 h-7 text-[#0061A8]" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-[#023047] group-hover:text-[#0061A8]">{t('modules.aqarSouq.title','Aqar Souq')}</div>
                  <div className="text-sm text-gray-600">{t('modules.aqarSouq.desc','Real estate catalog; viewable public pins, login to act.')}</div>
                </div>
              </div>
            </Link>
            <Link href="/marketplace/materials" className="group rounded-2xl border bg-white p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[#00A859]/10">
                  <ShoppingBag className="w-7 h-7 text-[#00A859]" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-[#023047] group-hover:text-[#00A859]">{t('modules.fixzitSouq.title','Fixzit Souq')}</div>
                  <div className="text-sm text-gray-600">{t('modules.fixzitSouq.desc','Materials & services marketplace with 5% margin logic.')}</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-12 bg-white/70 backdrop-blur border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-lg font-medium text-[#023047]">
              {t('cta.banner', 'Ready to modernize your FM operations with Arabic/English by default?')}
            </p>
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0061A8] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              {t('cta.signIn', 'Sign in')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
