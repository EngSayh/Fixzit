'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Map, Building2, Home, Search, Filter, Heart, TrendingUp, Star, BarChart3, Plus } from 'lucide-react';
import AqarSearchBar from '@/src/components/aqar/AqarSearchBar';
import AqarListingCard from '@/src/components/aqar/AqarListingCard';
import AqarMapView from '@/src/components/aqar/AqarMapView';

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

interface Listing {
  _id: string;
  slug: string;
  title: string;
  description: string;
  purpose: 'sale' | 'rent' | 'daily';
  propertyType: string;
  price: {
    amount: number;
    currency: string;
    period: string;
  };
  specifications: {
    area: number;
    bedrooms?: number;
    bathrooms?: number;
    livingRooms?: number;
    furnished: boolean;
    parking?: number;
    balcony?: boolean;
    pool?: boolean;
    gym?: boolean;
    security?: boolean;
    elevator?: boolean;
  };
  location: {
    lat: number;
    lng: number;
    city: string;
    district: string;
    neighborhood?: string;
  };
  media: Array<{
    url: string;
    alt?: string;
    type: 'image' | 'video';
    isCover: boolean;
  }>;
  contact: {
    name: string;
    phone: string;
    whatsapp?: string;
    isVerified: boolean;
  };
  isVerified: boolean;
  isFeatured: boolean;
  isPremium: boolean;
  views: number;
  favorites: number;
  publishedAt: string;
}

export default function AqarPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/aqar/listings?limit=12');
      const data = await response.json();
      
      if (data.success) {
        setListings(data.data.listings);
      } else {
        setError(data.error || 'Failed to fetch listings');
      }
    } catch (err) {
      setError('Failed to fetch listings');
      console.error('Error fetching listings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleListingClick = (listing: Listing) => {
    window.location.href = `/aqar/${listing.slug || listing._id}`;
  };

  const t = (ar: string, en: string) => lang === 'ar' ? ar : en;

  return (
    <div className="min-h-screen bg-gray-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#0061A8] to-[#00A859] text-white py-16 px-4 text-center">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {t('عقار سوق', 'Aqar Marketplace')}
          </h1>
          <p className="text-xl mb-8 text-white/90 max-w-3xl mx-auto">
            {t('اكتشف واستثمر في العقارات في جميع أنحاء المملكة', 'Discover and invest in real estate properties across the Kingdom')}
          </p>
          
          {/* Language Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/20 rounded-lg p-1">
              <button
                onClick={() => setLang('ar')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  lang === 'ar' ? 'bg-white text-[#0061A8]' : 'text-white hover:bg-white/20'
                }`}
              >
                العربية
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  lang === 'en' ? 'bg-white text-[#0061A8]' : 'text-white hover:bg-white/20'
                }`}
              >
                English
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/aqar/map"
              className="px-6 py-3 bg-white hover:bg-gray-100 text-[#0061A8] font-semibold rounded-lg transition-colors"
            >
              {t('استكشف الخريطة', 'Explore Map')}
            </Link>
            <Link
              href="/aqar/post"
              className="px-6 py-3 bg-[#FFB400] hover:bg-[#e6a200] text-black font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {t('أضف إعلان', 'Add Listing')}
            </Link>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <AqarSearchBar lang={lang} />
        </div>
      </section>

      {/* View Toggle */}
      <section className="px-4 mb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {t('العقارات المتاحة', 'Available Properties')}
            </h2>
            
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[#0061A8] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('عرض الشبكة', 'Grid View')}
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'map'
                    ? 'bg-[#0061A8] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('عرض الخريطة', 'Map View')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="px-4 pb-16">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0061A8] mx-auto mb-4"></div>
                <p className="text-gray-600">{t('جاري التحميل...', 'Loading...')}</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="text-red-600 mb-4">{error}</div>
              <button
                onClick={fetchListings}
                className="px-6 py-3 bg-[#0061A8] text-white rounded-lg hover:bg-[#0056a3] transition-colors"
              >
                {t('إعادة المحاولة', 'Retry')}
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <AqarListingCard
                  key={listing._id}
                  listing={listing}
                  lang={lang}
                />
              ))}
            </div>
          ) : (
            <AqarMapView
              listings={listings}
              onListingClick={handleListingClick}
              lang={lang}
              height="600px"
            />
          )}

          {!loading && !error && listings.length === 0 && (
            <div className="text-center py-16">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('لا توجد عقارات متاحة', 'No Properties Available')}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('جرب تعديل معايير البحث أو أضف عقارك الأول', 'Try adjusting your search criteria or add your first property')}
              </p>
              <Link
                href="/aqar/post"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0061A8] text-white rounded-lg hover:bg-[#0056a3] transition-colors"
              >
                <Plus className="w-5 h-5" />
                {t('أضف إعلان', 'Add Listing')}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            {t('مميزات منصة عقار', 'Aqar Platform Features')}
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
                    <div className="p-3 bg-[#0061A8]/10 rounded-lg group-hover:bg-[#0061A8]/20 transition-colors">
                      <Icon className="h-6 w-6 text-[#0061A8]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2 text-gray-900 group-hover:text-[#0061A8]">
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

