'use client';

import React from 'react';
import Link from 'next/link';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import { useTranslation } from '@/contexts/TranslationContext';
import landingTranslations from '@/i18n/sources/landing.translations.json';

const LANDING_TRANSLATIONS = landingTranslations as {
  en: Record<string, string>;
  ar: Record<string, string>;
};

const resolveLandingKey = (id?: string) => {
  if (!id) {
    return null;
  }
  return id.startsWith('landing.') ? id : `landing.${id}`;
};

const getLandingFallback = (locale: string, id: string | undefined, fallback: string) => {
  const key = resolveLandingKey(id);
  if (!key) {
    return fallback;
  }

  const bucket = locale.toLowerCase().startsWith('ar') ? LANDING_TRANSLATIONS.ar : LANDING_TRANSLATIONS.en;
  return bucket?.[key] ?? fallback;
};

export default function LandingPage() {
  const auto = useAutoTranslator('landing');
  const { locale } = useTranslation();
  const resolvedLocale = locale || 'en-US';

  const translate = (fallback: string, id?: string, params?: Record<string, string | number>) => {
    return auto(getLandingFallback(resolvedLocale, id, fallback), id, params);
  };

  const heroHighlights = [
    { id: 'rapid-rfq', text: translate('Rapid RFQ', 'hero.highlights.rapidRfq') },
    { id: 'linked-orders', text: translate('Work Order linked orders', 'hero.highlights.linkedOrders') },
    { id: 'finance-ready', text: translate('Finance ready invoices', 'hero.highlights.financeReady') },
  ];

  const modules = [
    {
      id: 'work-orders',
      title: translate('Work Orders', 'modules.workOrders.title'),
      description: translate(
        'Blue logic, brown theme: new, in progress, completed, overdue with SLA timers and photos.',
        'modules.workOrders.description'
      ),
    },
    {
      id: 'properties',
      title: translate('Properties', 'modules.properties.title'),
      description: translate(
        'Units, assets, leases, owners and tenants with health status per property.',
        'modules.properties.description'
      ),
    },
    {
      id: 'finance',
      title: translate('Finance', 'modules.finance.title'),
      description: translate(
        'Invoices, receipts, expenses and ZATCA-ready billing aligned with Fixzit finance flows.',
        'modules.finance.description'
      ),
    },
    {
      id: 'hr',
      title: translate('HR', 'modules.hr.title'),
      description: translate(
        'Technicians, supervisors, shifts and skills matrix with clean status chips.',
        'modules.hr.description'
      ),
    },
    {
      id: 'crm-support',
      title: translate('CRM & Support', 'modules.crm.title'),
      description: translate(
        'Tickets, SLAs and CSAT in a unified shell, ready for channels and bots.',
        'modules.crm.description'
      ),
    },
    {
      id: 'souq',
      title: translate('Fixzit Souq', 'modules.souq.title'),
      description: translate(
        'Vendor onboarding, catalogs and orders using your existing Souq logic in a calmer UI.',
        'modules.souq.description'
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <header role="banner" className="border-b bg-background">
        <nav aria-label="Primary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <img
                src="/img/fixzit-logo.png"
                alt="Fixzit"
                className="h-6 w-auto fxz-topbar-logo"
                data-testid="header-logo-img"
              />
              Fixzit
            </span>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Link className="hover:text-foreground" href="/properties">Properties</Link>
              <Link className="hover:text-foreground" href="/work-orders">Work Orders</Link>
              <Link className="hover:text-foreground" href="/finance">Finance</Link>
            </div>
          </div>
        </nav>
      </header>
      <section className="fxz-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 flex flex-col lg:flex-row items-center gap-10">
          <div className="flex-1 space-y-6">
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              {translate('Facility Management · Marketplaces · Saudi-first', 'hero.tagline')}
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight text-foreground">
              {translate('Operate properties with calm.', 'hero.title.line1')} <br />
              {translate('Move money with confidence.', 'hero.title.line2')}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl">
              {translate(
                'A brown, calm Fixzit shell: unified Work Orders, Properties, Finance, HR and Souq in a single, Apple-inspired interface built for Saudi FM teams.',
                'hero.description'
              )}
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="fxz-btn-primary px-4 py-2 text-sm font-medium">
                {translate('Get started with Fixzit', 'hero.actions.getStarted')}
              </button>
              <button className="fxz-btn-outline px-4 py-2 text-sm font-medium">
                {translate('Book a live demo', 'hero.actions.bookDemo')}
              </button>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm font-semibold">
              {heroHighlights.map((highlight) => (
                <span key={highlight.id} className="rounded-full bg-white/20 px-4 py-2">
                  {highlight.text}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full">
            <div className="fxz-card p-4 sm:p-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    {translate('Complete facility management suite', 'hero.preview.title')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {translate('Everything you need to manage properties, work orders, vendors, and finances in one unified platform.', 'hero.preview.description')}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                      <svg className="h-3 w-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{translate('Real-time work order tracking', 'hero.preview.feature1')}</p>
                      <p className="text-xs text-muted-foreground">{translate('Monitor status, SLAs, and team performance', 'hero.preview.feature1.desc')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                      <svg className="h-3 w-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{translate('Vendor & procurement management', 'hero.preview.feature2')}</p>
                      <p className="text-xs text-muted-foreground">{translate('RFQs, purchase orders, and vendor ratings', 'hero.preview.feature2.desc')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                      <svg className="h-3 w-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{translate('ZATCA-compliant invoicing', 'hero.preview.feature3')}</p>
                      <p className="text-xs text-muted-foreground">{translate('Automated billing with Saudi e-invoicing standards', 'hero.preview.feature3.desc')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="modules" className="py-10 bg-[hsl(var(--section-alt))] flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-1">
              {translate('Everything your FM operation needs — connected', 'modules.title')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {translate(
                'Brown, calm and structured: one shell for Work Orders, Properties, Finance, HR and Souq.',
                'modules.subtitle'
              )}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <div key={module.id} className="fxz-card p-4">
                <h3 className="font-semibold mb-1">{module.title}</h3>
                <p className="text-sm text-muted-foreground">{module.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
