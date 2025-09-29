"use client";

import Link from "next/link";
import { Map, Building2, Home, Search, Filter, Heart, TrendingUp, Star, BarChart3 } from "lucide-react";

const AQAR_FEATURES = [
  {
    title: 'Interactive Property Map',
    icon: Map,
    description: 'Explore properties on an interactive map with real-time data',
    link: '/aqar/map'
  },
  {
    title: 'Property Search',
    icon: Search,
    description: 'Advanced search with filters for location, price, and features',
    link: '/aqar/search'
  },
  {
    title: 'Property Listings',
    icon: Building2,
    description: 'Browse detailed property listings with photos and specifications',
    link: '/aqar/properties'
  },
  {
    title: 'My Listings',
    icon: Home,
    description: 'Manage your property listings and inquiries',
    link: '/aqar/listings'
  },
  {
    title: 'Advanced Filters',
    icon: Filter,
    description: 'Filter properties by location, price range, property type, and more',
    link: '/aqar/filters'
  },
  {
    title: 'Favorites',
    icon: Heart,
    description: 'Save and organize your favorite properties',
    link: '/aqar/favorites'
  },
  {
    title: 'Market Trends',
    icon: TrendingUp,
    description: 'View market analysis and property value trends',
    link: '/aqar/trends'
  },
  {
    title: 'Premium Listings',
    icon: Star,
    description: 'Access exclusive premium property listings',
    link: '/aqar/premium'
  }
];

export default function AqarPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#FFB400] to-[#FF8C00] text-white py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Aqar Souq
          </h1>
          <p className="text-xl mb-8 text-white/90 max-w-3xl mx-auto">
            Discover and invest in real estate properties across the region
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/aqar/map"
              className="px-6 py-3 bg-white hover:bg-gray-100 text-[#FFB400] font-semibold rounded-lg transition-colors"
            >
              Explore Map
            </Link>
            <Link
              href="/aqar/search"
              className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-colors"
            >
              Search Properties
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Real Estate Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AQAR_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.title}
                  href={feature.link}
                  className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-gray-200 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-[#FFB400]/10 rounded-lg group-hover:bg-[#FFB400]/20 transition-colors">
                      <Icon className="h-6 w-6 text-[#FFB400]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2 text-gray-900 group-hover:text-[#FFB400]">
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

