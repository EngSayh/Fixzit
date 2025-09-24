'use client';

import Link from "next/link";
import { useI18n } from '@/src/providers/RootProviders';
import { Building2, ShoppingBag, Globe } from 'lucide-react';

export default function LandingPage(){
  const { t, language, isRTL } = useI18n();

  return (
    <div> {/* Fixed header compensation handled by ResponsiveLayout */}
      {/* Hero Section with Gradient Background */}
      <section className="relative min-h-[600px] flex items-center justify-center text-center overflow-hidden">
        {/* Gradient background matching brand colors */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0061A8] via-[#0061A8]/90 to-[#00A859]/80"></div>
        
        {/* Content */}
        <div className="relative max-w-4xl mx-auto z-10 px-4 py-20">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white drop-shadow-lg">
            {t('landing.title', 'Enterprise Facility Management Platform')}
          </h1>
          <p className="text-xl mb-8 text-white/90 max-w-3xl mx-auto">
            {t('landing.subtitle', 'Comprehensive solution for property management, maintenance, and marketplace services')}
          </p>

          {/* CTA Buttons - Per user specifications */}
          <div className="flex flex-wrap gap-4 justify-center mb-12">
            <Link 
              href="/marketplace" 
              className="px-8 py-4 bg-white hover:bg-gray-100 text-[#0061A8] font-semibold rounded-lg transition-all transform hover:scale-105 shadow-xl flex items-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              {t('landing.hero.marketplace', 'Marketplace')}
            </Link>
            <Link 
              href="/souq" 
              className="px-8 py-4 bg-white hover:bg-gray-100 text-[#00A859] font-semibold rounded-lg transition-all transform hover:scale-105 shadow-xl flex items-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              {t('landing.hero.cta2', 'Fixzit Souq')}
            </Link>
            <Link 
              href="/login" 
              className="px-8 py-4 bg-[#00A859] hover:bg-[#00A859]/90 text-white font-semibold rounded-lg transition-all transform hover:scale-105 shadow-xl flex items-center gap-2"
            >
              <Building2 className="w-5 h-5" />
              {t('landing.hero.cta1', 'Access Fixzit')}
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            {t('landing.features.title', 'Complete Facility Management Solution')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">🏢</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Properties & Units</h3>
              <p className="text-gray-600 mb-4">Comprehensive property and unit management with lease tracking</p>
              <Link href="/fm/properties" className="text-[#0061A8] hover:text-[#0061A8]/80 font-medium">
                Explore →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">🔧</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Work Orders</h3>
              <p className="text-gray-600 mb-4">Efficient maintenance workflow with SLA tracking</p>
              <Link href="/fm/work-orders" className="text-[#0061A8] hover:text-[#0061A8]/80 font-medium">
                Explore →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Finance & Accounting</h3>
              <p className="text-gray-600 mb-4">Automated expense tracking and ZATCA-compliant invoicing</p>
              <Link href="/fm/finance" className="text-[#0061A8] hover:text-[#0061A8]/80 font-medium">
                Explore →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">🛍️</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Marketplace (Souq)</h3>
              <p className="text-gray-600 mb-4">Materials sourcing and real estate marketplace</p>
              <Link href="/marketplace" className="text-[#0061A8] hover:text-[#0061A8]/80 font-medium">
                Explore →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">🛡️</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Compliance & Legal</h3>
              <p className="text-gray-600 mb-4">Stay compliant with regulations and manage contracts</p>
              <Link href="/fm/compliance" className="text-[#0061A8] hover:text-[#0061A8]/80 font-medium">
                Explore →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Analytics & Reports</h3>
              <p className="text-gray-600 mb-4">Gain insights with comprehensive reporting and analytics</p>
              <Link href="/fm/reports" className="text-[#0061A8] hover:text-[#0061A8]/80 font-medium">
                Explore →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-[#0061A8] text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            {t('landing.cta.title', 'Ready to transform your facility management?')}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {t('landing.cta.subtitle', 'Join thousands of properties already using Fixzit to streamline operations')}
          </p>
          <Link
            href="/login"
            className="inline-flex px-8 py-4 bg-white hover:bg-gray-100 text-[#0061A8] font-semibold rounded-lg transition-all transform hover:scale-105 shadow-xl"
          >
            {t('landing.cta.button', 'Get Started Today')}
          </Link>
        </div>
      </section>

    </div>
  );
}
