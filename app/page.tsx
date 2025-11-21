'use client';

import React from 'react';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import { useTranslation } from '@/contexts/TranslationContext';
import { APP_DEFAULTS } from '@/config/constants';
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

  const formatNumber = (value: number, options?: Intl.NumberFormatOptions) => {
    try {
      return new Intl.NumberFormat(resolvedLocale, options).format(value);
    } catch {
      return value.toString();
    }
  };

  const formatCurrency = (value: number) =>
    formatNumber(value, {
      style: 'currency',
      currency: APP_DEFAULTS.currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    });

  const formatPercent = (value: number) =>
    formatNumber(value, {
      style: 'percent',
      maximumFractionDigits: 0,
    });

  const workOrderCount = 124;
  const overdueCount = 18;
  const propertyCount = 32;
  const occupancyRatio = 0.91;
  const invoiceValue = 1_400_000;

  const heroHighlights = [
    { id: 'rapid-rfq', text: translate('Rapid RFQ', 'hero.highlights.rapidRfq') },
    { id: 'linked-orders', text: translate('Work Order linked orders', 'hero.highlights.linkedOrders') },
    { id: 'finance-ready', text: translate('Finance ready invoices', 'hero.highlights.financeReady') },
  ];

  const heroMetrics = [
    {
      id: 'work-orders',
      label: translate('Work Orders', 'hero.metrics.workOrders.label'),
      value: formatNumber(workOrderCount),
      subLabel: translate('{{count}} overdue', 'hero.metrics.workOrders.sub', {
        count: formatNumber(overdueCount),
      }),
    },
    {
      id: 'properties',
      label: translate('Properties', 'hero.metrics.properties.label'),
      value: formatNumber(propertyCount),
      subLabel: translate('{{percentage}} occupied', 'hero.metrics.properties.sub', {
        percentage: formatPercent(occupancyRatio),
      }),
    },
    {
      id: 'invoices',
      label: translate('Invoices', 'hero.metrics.invoices.label'),
      value: formatCurrency(invoiceValue),
      subLabel: translate('this month', 'hero.metrics.invoices.sub'),
    },
  ];

  const heroSubtitle = translate('{{active}} active work orders · {{overdue}} overdue', 'hero.metrics.subtitle', {
    active: formatNumber(workOrderCount),
    overdue: formatNumber(overdueCount),
  });

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
              <div className="flex justify-between items-center mb-4">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {translate('Today · Portfolio overview', 'hero.metrics.title')}
                  </p>
                  <p className="font-semibold text-sm">
                    {heroSubtitle}
                  </p>
                </div>
                <span className="px-2 py-1 rounded-full text-[11px] bg-secondary text-secondary-foreground">
                  {translate('FM Command', 'hero.metrics.badge')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {heroMetrics.map((metric) => (
                  <div key={metric.id} className="p-3 rounded-xl border border-border bg-card">
                    <p className="text-[11px] text-muted-foreground">{metric.label}</p>
                    <p className="text-lg font-semibold">{metric.value}</p>
                    <p className="text-[11px] text-muted-foreground">{metric.subLabel}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
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
