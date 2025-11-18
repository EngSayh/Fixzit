'use client';

import { useAutoTranslator } from '@/i18n/useAutoTranslator';

export default function LandingPage() {
  const auto = useAutoTranslator('landing');

  const heroHighlights = [
    { id: 'rapid-rfq', text: auto('Rapid RFQ', 'hero.highlights.rapidRfq') },
    { id: 'linked-orders', text: auto('Work Order linked orders', 'hero.highlights.linkedOrders') },
    { id: 'finance-ready', text: auto('Finance ready invoices', 'hero.highlights.financeReady') },
  ];

  const heroMetrics = [
    {
      id: 'work-orders',
      label: auto('Work Orders', 'hero.metrics.workOrders.label'),
      value: '124',
      subLabel: auto('18 overdue', 'hero.metrics.workOrders.sub'),
    },
    {
      id: 'properties',
      label: auto('Properties', 'hero.metrics.properties.label'),
      value: '32',
      subLabel: auto('91% occupied', 'hero.metrics.properties.sub'),
    },
    {
      id: 'invoices',
      label: auto('Invoices', 'hero.metrics.invoices.label'),
      value: new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', notation: 'compact', maximumFractionDigits: 1 }).format(1400000),
      subLabel: auto('this month', 'hero.metrics.invoices.sub'),
    },
  ];

  const modules = [
    {
      id: 'work-orders',
      title: auto('Work Orders', 'modules.workOrders.title'),
      description: auto(
        'Blue logic, brown theme: new, in progress, completed, overdue with SLA timers and photos.',
        'modules.workOrders.description'
      ),
    },
    {
      id: 'properties',
      title: auto('Properties', 'modules.properties.title'),
      description: auto(
        'Units, assets, leases, owners and tenants with health status per property.',
        'modules.properties.description'
      ),
    },
    {
      id: 'finance',
      title: auto('Finance', 'modules.finance.title'),
      description: auto(
        'Invoices, receipts, expenses and ZATCA-ready billing aligned with Fixzit finance flows.',
        'modules.finance.description'
      ),
    },
    {
      id: 'hr',
      title: auto('HR', 'modules.hr.title'),
      description: auto(
        'Technicians, supervisors, shifts and skills matrix with clean status chips.',
        'modules.hr.description'
      ),
    },
    {
      id: 'crm-support',
      title: auto('CRM & Support', 'modules.crm.title'),
      description: auto(
        'Tickets, SLAs and CSAT in a unified shell, ready for channels and bots.',
        'modules.crm.description'
      ),
    },
    {
      id: 'souq',
      title: auto('Fixzit Souq', 'modules.souq.title'),
      description: auto(
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
              {auto('Facility Management · Marketplaces · Saudi-first', 'hero.tagline')}
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight text-foreground">
              {auto('Operate properties with calm.', 'hero.title.line1')} <br />
              {auto('Move money with confidence.', 'hero.title.line2')}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl">
              {auto(
                'A brown, calm Fixzit shell: unified Work Orders, Properties, Finance, HR and Souq in a single, Apple-inspired interface built for Saudi FM teams.',
                'hero.description'
              )}
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="fxz-btn-primary px-4 py-2 text-sm font-medium">
                {auto('Get started with Fixzit', 'hero.actions.getStarted')}
              </button>
              <button className="fxz-btn-outline px-4 py-2 text-sm font-medium">
                {auto('Book a live demo', 'hero.actions.bookDemo')}
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
                    {auto('Today · Portfolio overview', 'hero.metrics.title')}
                  </p>
                  <p className="font-semibold text-sm">
                    {auto('124 active work orders · 18 overdue', 'hero.metrics.subtitle')}
                  </p>
                </div>
                <span className="px-2 py-1 rounded-full text-[11px] bg-secondary text-secondary-foreground">
                  {auto('FM Command', 'hero.metrics.badge')}
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
              {auto('Everything your FM operation needs — connected', 'modules.title')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {auto(
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
