'use client';
// app/marketplace/page.tsx - Public marketplace landing
import Link from 'next/link';
import { Package, Building2, Search, Filter, Shield, Users, Truck } from 'lucide-react';

export default function MarketplacePage() {
  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="bg-[#0061A8] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Fixzit Marketplace
          </h1>
          <p className="text-xl mb-8 text-white/90 max-w-3xl mx-auto">
            Browse thousands of properties and materials from verified vendors across Saudi Arabia
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/marketplace/properties"
              className="px-8 py-4 bg-white hover:bg-gray-100 text-[#0061A8] font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Building2 className="h-5 w-5" />
              Browse Properties
            </Link>
            <Link
              href="/marketplace/materials"
              className="px-8 py-4 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Package className="h-5 w-5" />
              Browse Materials
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Marketplace Categories
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Real Estate */}
            <Link href="/marketplace/properties" className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#0061A8]/10 rounded-lg group-hover:bg-[#0061A8]/20 transition-colors">
                  <Building2 className="h-8 w-8 text-[#0061A8]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900 group-hover:text-[#0061A8]">
                    Real Estate
                  </h3>
                  <p className="text-gray-600">
                    Properties, apartments, and commercial spaces
                  </p>
                </div>
              </div>
            </Link>

            {/* Materials */}
            <Link href="/marketplace/materials" className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#00A859]/10 rounded-lg group-hover:bg-[#00A859]/20 transition-colors">
                  <Package className="h-8 w-8 text-[#00A859]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900 group-hover:text-[#00A859]">
                    Materials
                  </h3>
                  <p className="text-gray-600">
                    Construction materials, equipment, and supplies
                  </p>
                </div>
              </div>
            </Link>

            {/* Services */}
            <Link href="/marketplace/materials?category=services" className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#FFB400]/10 rounded-lg group-hover:bg-[#FFB400]/20 transition-colors">
                  <Filter className="h-8 w-8 text-[#FFB400]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900 group-hover:text-[#FFB400]">
                    Services
                  </h3>
                  <p className="text-gray-600">
                    Professional services and contractors
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-gray-900">
            Find What You're Looking For
          </h2>
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search properties, materials, or services..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0061A8]"
              />
              <button className="px-6 py-3 bg-[#0061A8] text-white rounded-lg hover:bg-[#0061A8]/90 transition-colors flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search
              </button>
            </div>
            <p className="text-gray-600 mt-4">
              Browse thousands of verified listings from trusted vendors across Saudi Arabia
            </p>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Trusted by Thousands
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="p-4 bg-[#0061A8]/10 rounded-full mb-4">
                <Shield className="h-12 w-12 text-[#0061A8]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Verified Vendors</h3>
              <p className="text-gray-600">All vendors are verified and background-checked</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="p-4 bg-[#00A859]/10 rounded-full mb-4">
                <Users className="h-12 w-12 text-[#00A859]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">10,000+ Listings</h3>
              <p className="text-gray-600">Properties and materials from trusted suppliers</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="p-4 bg-[#FFB400]/10 rounded-full mb-4">
                <Truck className="h-12 w-12 text-[#FFB400]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Fast Delivery</h3>
              <p className="text-gray-600">Quick turnaround on orders and services</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}