'use client';

import Link from "next/link";
import { useTranslation } from "@/contexts/TranslationContext";

export default function LandingPage(){
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-16">

      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">
            {t('landing.title', 'Fixzit Enterprise Platform')}
          </h1>
          <p className="text-xl mb-8 text-muted-foreground max-w-3xl mx-auto">
            {t('landing.subtitle', 'Unified Facility Management + Marketplace Solution for modern property operations')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-12">
            <Link href="/fm" role="button" className="px-8 py-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-2xl transition-colors">
              {t('landing.hero.cta1', 'Access Fixzit FM')}
            </Link>
            <Link href="/souq" role="button" className="px-8 py-4 bg-success hover:bg-success/90 text-white font-semibold rounded-2xl transition-colors">
              {t('landing.hero.cta2', 'Fixzit Souq')}
            </Link>
            <Link href="/aqar" role="button" className="px-8 py-4 bg-accent hover:bg-accent/90 text-white font-semibold rounded-2xl transition-colors">
              {t('landing.hero.cta3', 'Aqar Real Estate')}
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-card">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            {t('landing.features.title', 'Complete Facility Management Solution')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-muted p-6 rounded-2xl">
              <h3 className="text-xl font-semibold mb-2 text-foreground">{t('landing.features.property.title', 'Property Management')}</h3>
              <p className="text-muted-foreground mb-4">{t('landing.features.property.desc', 'Manage your real estate portfolio, track occupancy, and handle tenant relations')}</p>
              <Link href="/fm/properties" className="text-primary hover:text-primary/90 font-medium">
                {t('landing.features.property.cta', 'Explore →')}
              </Link>
            </div>

            <div className="bg-muted p-6 rounded-2xl">
              <h3 className="text-xl font-semibold mb-2 text-foreground">{t('landing.features.workorders.title', 'Work Orders')}</h3>
              <p className="text-muted-foreground mb-4">{t('landing.features.workorders.desc', 'Create, assign, and track maintenance requests with SLA management')}</p>
              <Link href="/fm/work-orders" className="text-primary hover:text-primary/90 font-medium">
                {t('landing.features.workorders.cta', 'Explore →')}
              </Link>
            </div>

            <div className="bg-muted p-6 rounded-2xl">
              <h3 className="text-xl font-semibold mb-2 text-foreground">{t('landing.features.vendors.title', 'Vendors & RFQs')}</h3>
              <p className="text-muted-foreground mb-4">{t('landing.features.vendors.desc', 'Source materials, manage vendors, and streamline procurement')}</p>
              <Link href="/fm/vendors" className="text-primary hover:text-primary/90 font-medium">
                {t('landing.features.vendors.cta', 'Explore →')}
              </Link>
            </div>

            <div className="bg-muted p-6 rounded-2xl">
              <h3 className="text-xl font-semibold mb-2 text-foreground">{t('landing.features.finance.title', 'Finance & Billing')}</h3>
              <p className="text-muted-foreground mb-4">{t('landing.features.finance.desc', 'Handle invoicing, payments, and financial reporting')}</p>
              <Link href="/fm/finance" className="text-primary hover:text-primary/90 font-medium">
                {t('landing.features.finance.cta', 'Explore →')}
              </Link>
            </div>

            <div className="bg-muted p-6 rounded-2xl">
              <h3 className="text-xl font-semibold mb-2 text-foreground">{t('landing.features.crm.title', 'CRM & Tenants')}</h3>
              <p className="text-muted-foreground mb-4">{t('landing.features.crm.desc', 'Manage tenant relationships and customer service')}</p>
              <Link href="/fm/crm" className="text-primary hover:text-primary/90 font-medium">
                {t('landing.features.crm.cta', 'Explore →')}
              </Link>
            </div>

            <div className="bg-muted p-6 rounded-2xl">
              <h3 className="text-xl font-semibold mb-2 text-foreground">{t('landing.features.analytics.title', 'Analytics & Reports')}</h3>
              <p className="text-muted-foreground mb-4">{t('landing.features.analytics.desc', 'Gain insights with comprehensive reporting and analytics')}</p>
              <Link href="/fm/analytics" className="text-primary hover:text-primary/90 font-medium">
                {t('landing.features.analytics.cta', 'Explore →')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            {t('landing.cta.title', 'Ready to transform your facility management?')}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {t('landing.cta.subtitle', 'Join thousands of properties already using Fixzit to streamline operations')}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/login"
              role="button"
              className="inline-flex px-8 py-4 bg-card hover:bg-muted text-primary font-semibold rounded-2xl transition-colors"
            >
              {t('landing.cta.login', 'Get Started / Login')}
            </Link>
            <Link 
              href="/request-demo" 
              role="button" 
              className="inline-flex px-8 py-4 bg-transparent border-2 border-white hover:bg-white/10 text-white font-semibold rounded-2xl transition-colors"
            >
              {t('landing.cta.demo', 'Request a Demo')}
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
