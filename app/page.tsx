'use client';

import Link from "next/link";
import Footer from "@/src/components/Footer";
import { useI18n } from '@/src/providers/RootProviders';

export default function LandingPage(){
  const { t, language, isRTL } = useI18n();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-16">

      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900">
            {t('landing.title', 'Fixzit Enterprise Platform')}
          </h1>
          <p className="text-xl mb-8 text-gray-600 max-w-3xl mx-auto">
            {t('landing.subtitle', 'Unified Facility Management + Marketplace Solution for modern property operations')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-12">
            <Link href="/fm" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
              {t('landing.hero.cta1', 'Access Fixzit FM')}
            </Link>
            <Link href="/souq" className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors">
              {t('landing.hero.cta2', 'Fixzit Souq')}
            </Link>
            <Link href="/aqar" className="px-8 py-4 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-colors">
              {t('landing.hero.cta3', 'Aqar Real Estate')}
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            {t('landing.features.title', 'Complete Facility Management Solution')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Property Management</h3>
              <p className="text-gray-600 mb-4">Manage your real estate portfolio, track occupancy, and handle tenant relations</p>
              <Link href="/fm/properties" className="text-blue-600 hover:text-blue-800 font-medium">
                Explore →
              </Link>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Work Orders</h3>
              <p className="text-gray-600 mb-4">Create, assign, and track maintenance requests with SLA management</p>
              <Link href="/fm/work-orders" className="text-blue-600 hover:text-blue-800 font-medium">
                Explore →
              </Link>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Vendors & RFQs</h3>
              <p className="text-gray-600 mb-4">Source materials, manage vendors, and streamline procurement</p>
              <Link href="/fm/vendors" className="text-blue-600 hover:text-blue-800 font-medium">
                Explore →
              </Link>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Finance & Billing</h3>
              <p className="text-gray-600 mb-4">Handle invoicing, payments, and financial reporting</p>
              <Link href="/fm/finance" className="text-blue-600 hover:text-blue-800 font-medium">
                Explore →
              </Link>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-2 text-gray-900">CRM & Tenants</h3>
              <p className="text-gray-600 mb-4">Manage tenant relationships and customer service</p>
              <Link href="/fm/crm" className="text-blue-600 hover:text-blue-800 font-medium">
                Explore →
              </Link>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Analytics & Reports</h3>
              <p className="text-gray-600 mb-4">Gain insights with comprehensive reporting and analytics</p>
              <Link href="/fm/analytics" className="text-blue-600 hover:text-blue-800 font-medium">
                Explore →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to transform your facility management?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of properties already using Fixzit to streamline operations
          </p>
          <Link
            href="/login"
            className="inline-flex px-8 py-4 bg-white hover:bg-gray-100 text-blue-600 font-semibold rounded-lg transition-colors"
          >
            Get Started Today
          </Link>
        </div>
      </section>

    </div>
  );
}