'use client';

import { useState, useEffect } from 'react';
import AqarMapView from '@/src/components/aqar/AqarMapView';
import AqarSearchBar from '@/src/components/aqar/AqarSearchBar';
import AqarListingCard from '@/src/components/aqar/AqarListingCard';
import { MapPin, Grid, List } from 'lucide-react';

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

export default function AqarMapPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/aqar/listings?limit=100');
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
    setSelectedListing(listing);
  };

  const t = (ar: string, en: string) => lang === 'ar' ? ar : en;

  return (
    <div className="min-h-screen bg-gray-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-[#0061A8]" />
                {t('خريطة العقارات', 'Property Map')}
              </h1>
              <span className="text-sm text-gray-600">
                {listings.length} {t('عقار متاح', 'properties available')}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Language Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setLang('ar')}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    lang === 'ar' ? 'bg-white text-[#0061A8]' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  العربية
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    lang === 'en' ? 'bg-white text-[#0061A8]' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  English
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-1 rounded-md text-sm transition-colors flex items-center gap-1 ${
                    viewMode === 'map' ? 'bg-white text-[#0061A8]' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  {t('خريطة', 'Map')}
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded-md text-sm transition-colors flex items-center gap-1 ${
                    viewMode === 'list' ? 'bg-white text-[#0061A8]' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="w-4 h-4" />
                  {t('قائمة', 'List')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <AqarSearchBar lang={lang} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
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
        ) : viewMode === 'map' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map */}
            <div className="lg:col-span-2">
              <AqarMapView
                listings={listings}
                onListingClick={handleListingClick}
                lang={lang}
                height="600px"
              />
            </div>

            {/* Selected Listing Details */}
            <div className="lg:col-span-1">
              {selectedListing ? (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    {t('تفاصيل العقار المحدد', 'Selected Property Details')}
                  </h3>
                  <AqarListingCard listing={selectedListing} lang={lang} />
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="text-center text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>{t('انقر على علامة في الخريطة لعرض التفاصيل', 'Click on a marker to view details')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <AqarListingCard
                key={listing._id}
                listing={listing}
                lang={lang}
              />
            ))}
          </div>
        )}

        {!loading && !error && listings.length === 0 && (
          <div className="text-center py-16">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('لا توجد عقارات متاحة', 'No Properties Available')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('جرب تعديل معايير البحث أو أضف عقارك الأول', 'Try adjusting your search criteria or add your first property')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

