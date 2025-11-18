'use client';

import Link from 'next/link';
import { LineChart, Megaphone, Tag, MessageSquare, Receipt, Activity, ShieldCheck } from 'lucide-react';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';

type ToolConfig = {
  id: string;
  titleKey: string;
  subtitleKey: string;
  fallbackTitle: string;
  fallbackSubtitle: string;
  href: string;
  icon: typeof LineChart;
  badge?: string;
};

const SELLER_TOOLS: ToolConfig[] = [
  {
    id: 'analytics',
    titleKey: 'analytics.title',
    subtitleKey: 'analytics.subtitle',
    fallbackTitle: 'Analytics & Insights',
    fallbackSubtitle: 'Monitor revenue, orders, and customer journeys in real time.',
    href: '/marketplace/seller-central/analytics',
    icon: LineChart,
    badge: 'Live',
  },
  {
    id: 'advertising',
    titleKey: 'advertising.title',
    subtitleKey: 'advertising.subtitle',
    fallbackTitle: 'Advertising Studio',
    fallbackSubtitle: 'Launch Sponsored Products and monitor campaign performance.',
    href: '/marketplace/seller-central/advertising',
    icon: Megaphone,
  },
  {
    id: 'pricing',
    titleKey: 'pricing.title',
    subtitleKey: 'pricing.subtitle',
    fallbackTitle: 'Pricing & Promotions',
    fallbackSubtitle: 'Optimize price ladders and run marketplace promotions.',
    href: '/marketplace/seller-central/pricing',
    icon: Tag,
  },
  {
    id: 'reviews',
    titleKey: 'reviews.title',
    subtitleKey: 'reviews.subtitle',
    fallbackTitle: 'Reviews & Feedback',
    fallbackSubtitle: 'Respond to customers and improve product reputation.',
    href: '/marketplace/seller-central/reviews',
    icon: MessageSquare,
  },
  {
    id: 'settlements',
    titleKey: 'settlements.title',
    subtitleKey: 'settlements.subtitle',
    fallbackTitle: 'Settlements & Payouts',
    fallbackSubtitle: 'Track deposits, fees, and reconciliation.',
    href: '/marketplace/seller-central/settlements',
    icon: Receipt,
  },
  {
    id: 'health',
    titleKey: 'health.title',
    subtitleKey: 'health.subtitle',
    fallbackTitle: 'Account Health & KYC',
    fallbackSubtitle: 'Complete compliance tasks and resolve account flags.',
    href: '/marketplace/seller-central/health',
    icon: ShieldCheck,
  },
  {
    id: 'claims',
    titleKey: 'claims.title',
    subtitleKey: 'claims.subtitle',
    fallbackTitle: 'Claims & Disputes',
    fallbackSubtitle: 'Manage support tickets for damaged or missing orders.',
    href: '/marketplace/seller-central/claims',
    icon: Activity,
  },
  {
    id: 'kyc',
    titleKey: 'kyc.title',
    subtitleKey: 'kyc.subtitle',
    fallbackTitle: 'KYC Status',
    fallbackSubtitle: 'Review onboarding progress and submit documents.',
    href: '/marketplace/seller-central/kyc',
    icon: ShieldCheck,
  },
];

export default function SellerCentralHome() {
  const auto = useAutoTranslator('marketplace.sellerCentral.dashboard');

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <header className="space-y-3 text-center md:text-start">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
            {auto('Seller Central', 'header.kicker')}
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            {auto('Operate your marketplace business', 'header.title')}
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            {auto(
              'Access analytics, advertising, pricing, reviews, settlements, and compliance workflows from a single control center.',
              'header.subtitle',
            )}
          </p>
        </header>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SELLER_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.id}
                href={tool.href}
                className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground text-lg">
                        {auto(tool.fallbackTitle, tool.titleKey)}
                      </h3>
                      {tool.badge && (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {auto(tool.fallbackSubtitle, tool.subtitleKey)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}
