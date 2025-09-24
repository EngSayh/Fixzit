'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Package, Map, Search, Filter, Heart, ShoppingCart, User, LogIn, Shield, Star, TrendingUp } from 'lucide-react';

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('');

  const marketplaceSections = [
    {
      id: 'properties',
      title: 'Real Estate Marketplace',
      subtitle: 'Aqar-style property browsing',
      description: 'Browse properties for sale and rent across Saudi Arabia. No login required to explore listings.',
      icon: Building2,
      href: '/marketplace/properties',
      color: 'from-[#FFB400] to-[#FF8C00]',
      features: ['Property Search', 'Map View', 'Verified Listings', 'Agent Contact'],
      stats: { listings: '10,000+', cities: '15+', verified: '95%' }
    },
    {
      id: 'materials',
      title: 'Materials Marketplace',
      subtitle: 'Amazon-style materials shopping',
      description: 'Browse construction materials, tools, and equipment. Add to cart and checkout when ready.',
      icon: Package,
      href: '/marketplace/materials',
      color: 'from-[#0061A8] to-[#004080]',
      features: ['Product Catalog', 'Vendor Network', 'Price Comparison', 'Bulk Orders'],
      stats: { products: '50,000+', vendors: '500+', categories: '25+' }
    }
  ];

  const quickActions = [
    {
      title: 'Search Properties',
      description: 'Find your perfect property',
      icon: Search,
      href: '/marketplace/properties',
      color: 'bg-[#FFB400]'
    },
    {
      title: 'Browse Materials',
      description: 'Shop construction supplies',
      icon: Package,
      href: '/marketplace/materials',
      color: 'bg-[#0061A8]'
    },
    {
      title: 'Map View',
      description: 'Explore properties on map',
      icon: Map,
      href: '/aqar/map',
      color: 'bg-green-500'
    },
    {
      title: 'Advanced Search',
      description: 'Filter by specific criteria',
      icon: Filter,
      href: '/aqar/search',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-[#0061A8]">Fixzit Marketplace</h1>
              <div className="hidden md:flex items-center gap-6 text-sm">
                <Link href="/marketplace/properties" className="text-gray-600 hover:text-[#0061A8]">
                  Properties
                </Link>
                <Link href="/marketplace/materials" className="text-gray-600 hover:text-[#0061A8]">
                  Materials
                </Link>
                <Link href="/aqar" className="text-gray-600 hover:text-[#0061A8]">
                  Aqar Real Estate
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/login" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#0061A8]">
                <User className="w-4 h-4" />
                Sign In
              </Link>
              <Link href="/login" className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#0061A8] text-white rounded-md hover:bg-[#0061A8]/90">
                <LogIn className="w-4 h-4" />
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Banner */}
      <div className="bg-yellow-50 border-b border-yellow-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <Shield className="w-4 h-4" />
            <span>You're browsing as a guest. <Link href="/login" className="underline font-medium">Sign in</Link> to save favorites, contact sellers, and access exclusive features.</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#0061A8] to-[#004080] text-white py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Fixzit Marketplace
          </h1>
          <p className="text-xl mb-8 text-white/90 max-w-3xl mx-auto">
            Discover properties and materials across Saudi Arabia. Browse freely, sign in when you're ready to interact.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search properties, materials, or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 text-gray-900 rounded-lg focus:ring-2 focus:ring-white/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/marketplace/properties"
              className="px-6 py-3 bg-white hover:bg-gray-100 text-[#0061A8] font-semibold rounded-lg transition-colors"
            >
              Browse Properties
            </Link>
            <Link
              href="/marketplace/materials"
              className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-colors"
            >
              Shop Materials
            </Link>
          </div>
        </div>
      </section>

      {/* Marketplace Sections */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Choose Your Marketplace
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {marketplaceSections.map((section) => {
              const Icon = section.icon;
              return (
                <Link
                  key={section.id}
                  href={section.href}
                  className="group bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
                >
                  <div className="flex items-start gap-6">
                    <div className={`p-4 rounded-lg bg-gradient-to-br ${section.color} text-white`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold mb-2 text-gray-900 group-hover:text-[#0061A8]">
                        {section.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{section.subtitle}</p>
                      <p className="text-gray-600 mb-4">{section.description}</p>
                      
                      {/* Features */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {section.features.map((feature) => (
                          <span key={feature} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {feature}
                          </span>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="flex gap-6 text-sm text-gray-500">
                        {Object.entries(section.stats).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            <span>{value} {key}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Quick Actions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`p-3 rounded-lg ${action.color} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-[#0061A8]">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Why Choose Fixzit Marketplace?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-[#0061A8]/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-[#0061A8]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Verified Listings</h3>
              <p className="text-gray-600">All properties and materials are verified for authenticity and quality.</p>
            </div>

            <div className="text-center">
              <div className="bg-[#FFB400]/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-[#FFB400]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Guest Browsing</h3>
              <p className="text-gray-600">Browse freely without login. Sign in only when you want to interact.</p>
            </div>

            <div className="text-center">
              <div className="bg-green-500/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">KSA Compliant</h3>
              <p className="text-gray-600">Fully compliant with Saudi regulations including FAL, Ejar, and ZATCA.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>Browse freely. Sign in to save favorites, contact sellers, and access exclusive features.</p>
          </div>
        </div>
      </div>
    </div>
  );
}