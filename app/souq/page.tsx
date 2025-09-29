"use client";

import Link from "next/link";
import { Package, Users, FileText, ClipboardList, Truck, Star, Filter, Search, Settings } from "lucide-react";

const SOUQ_FEATURES = [
  {
    title: 'Catalog Management&apos;,
    icon: Package,
    description: &apos;Browse and manage your product catalog with advanced filtering&apos;,
    link: &apos;/souq/catalog&apos;
  },
  {
    title: &apos;Vendor Portal&apos;,
    icon: Users,
    description: &apos;Connect with verified vendors and suppliers&apos;,
    link: &apos;/souq/vendors&apos;
  },
  {
    title: &apos;RFQs & Bids&apos;,
    icon: FileText,
    description: &apos;Request for quotations and manage bidding processes&apos;,
    link: &apos;/souq/rfqs&apos;
  },
  {
    title: &apos;Order Management&apos;,
    icon: ClipboardList,
    description: &apos;Track orders, purchase orders, and delivery status&apos;,
    link: &apos;/souq/orders&apos;
  },
  {
    title: &apos;Shipping & Logistics&apos;,
    icon: Truck,
    description: &apos;Manage shipping, tracking, and logistics partners&apos;,
    link: &apos;/souq/shipping&apos;
  },
  {
    title: &apos;Reviews & Ratings&apos;,
    icon: Star,
    description: &apos;View and manage product reviews and vendor ratings&apos;,
    link: &apos;/souq/reviews&apos;
  }
];

export default function SouqPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#00A859] to-[#FFB400] text-white py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Fixzit Souq
          </h1>
          <p className="text-xl mb-8 text-white/90 max-w-3xl mx-auto">
            Your complete marketplace for facility management materials, equipment, and services
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/souq/catalog"
              className="px-6 py-3 bg-white hover:bg-gray-100 text-[#00A859] font-semibold rounded-lg transition-colors"
            >
              Browse Catalog
            </Link>
            <Link
              href="/souq/vendors"
              className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-colors"
            >
              View Vendors
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Marketplace Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SOUQ_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.title}
                  href={feature.link}
                  className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-gray-200 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-[#00A859]/10 rounded-lg group-hover:bg-[#00A859]/20 transition-colors">
                      <Icon className="h-6 w-6 text-[#00A859]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2 text-gray-900 group-hover:text-[#00A859]">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

