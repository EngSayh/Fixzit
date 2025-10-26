'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Home, DollarSign, Bed, Bath, Calendar, Filter } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface FilterState {
  propertyType: string;
  city: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  bathrooms: string;
  minArea: string;
  maxArea: string;
  furnished: string;
  availableFrom: string;
  keywords: string;
}

export default function FiltersPage() {
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>({
    propertyType: '',
    city: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    bathrooms: '',
    minArea: '',
    maxArea: '',
    furnished: '',
    availableFrom: '',
    keywords: '',
  });

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    router.push(`/aqar/search?${params.toString()}`);
  };

  const handleReset = () => {
    setFilters({
      propertyType: '',
      city: '',
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
      bathrooms: '',
      minArea: '',
      maxArea: '',
      furnished: '',
      availableFrom: '',
      keywords: '',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('aqar.filters.title', 'Search & Filters')}
          </h1>
          <p className="text-gray-600">
            {t('aqar.filters.subtitle', 'Find your perfect property with advanced search filters')}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {/* Keywords Search */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="inline-block w-4 h-4 mr-2" />
              {t('aqar.filters.keywords', 'Keywords')}
            </label>
            <input
              type="text"
              value={filters.keywords}
              onChange={(e) => handleFilterChange('keywords', e.target.value)}
              placeholder={t('aqar.filters.keywordsPlaceholder', 'Search by location, neighborhood, or description...')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Property Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Home className="inline-block w-4 h-4 mr-2" />
                {t('aqar.filters.propertyType', 'Property Type')}
              </label>
              <select
                value={filters.propertyType}
                onChange={(e) => handleFilterChange('propertyType', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="">{t('aqar.filters.any', 'Any')}</option>
                <option value="apartment">{t('aqar.propertyType.apartment', 'Apartment')}</option>
                <option value="villa">{t('aqar.propertyType.villa', 'Villa')}</option>
                <option value="townhouse">{t('aqar.propertyType.townhouse', 'Townhouse')}</option>
                <option value="penthouse">{t('aqar.propertyType.penthouse', 'Penthouse')}</option>
                <option value="studio">{t('aqar.propertyType.studio', 'Studio')}</option>
                <option value="office">{t('aqar.propertyType.office', 'Office')}</option>
                <option value="warehouse">{t('aqar.propertyType.warehouse', 'Warehouse')}</option>
                <option value="land">{t('aqar.propertyType.land', 'Land')}</option>
              </select>
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline-block w-4 h-4 mr-2" />
                {t('aqar.filters.city', 'City')}
              </label>
              <select
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="">{t('aqar.filters.any', 'Any')}</option>
                <option value="riyadh">{t('aqar.city.riyadh', 'Riyadh')}</option>
                <option value="jeddah">{t('aqar.city.jeddah', 'Jeddah')}</option>
                <option value="dammam">{t('aqar.city.dammam', 'Dammam')}</option>
                <option value="mecca">{t('aqar.city.mecca', 'Mecca')}</option>
                <option value="medina">{t('aqar.city.medina', 'Medina')}</option>
                <option value="khobar">{t('aqar.city.khobar', 'Khobar')}</option>
                <option value="taif">{t('aqar.city.taif', 'Taif')}</option>
              </select>
            </div>

            {/* Bedrooms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Bed className="inline-block w-4 h-4 mr-2" />
                {t('aqar.filters.bedrooms', 'Bedrooms')}
              </label>
              <select
                value={filters.bedrooms}
                onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="">{t('aqar.filters.any', 'Any')}</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
                <option value="5">5+</option>
              </select>
            </div>

            {/* Bathrooms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Bath className="inline-block w-4 h-4 mr-2" />
                {t('aqar.filters.bathrooms', 'Bathrooms')}
              </label>
              <select
                value={filters.bathrooms}
                onChange={(e) => handleFilterChange('bathrooms', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="">{t('aqar.filters.any', 'Any')}</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
            </div>

            {/* Min Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="inline-block w-4 h-4 mr-2" />
                {t('aqar.filters.minPrice', 'Min Price (SAR)')}
              </label>
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="inline-block w-4 h-4 mr-2" />
                {t('aqar.filters.maxPrice', 'Max Price (SAR)')}
              </label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                placeholder="∞"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            {/* Min Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('aqar.filters.minArea', 'Min Area (m²)')}
              </label>
              <input
                type="number"
                value={filters.minArea}
                onChange={(e) => handleFilterChange('minArea', e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            {/* Max Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('aqar.filters.maxArea', 'Max Area (m²)')}
              </label>
              <input
                type="number"
                value={filters.maxArea}
                onChange={(e) => handleFilterChange('maxArea', e.target.value)}
                placeholder="∞"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            {/* Furnished */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('aqar.filters.furnished', 'Furnished')}
              </label>
              <select
                value={filters.furnished}
                onChange={(e) => handleFilterChange('furnished', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="">{t('aqar.filters.any', 'Any')}</option>
                <option value="yes">{t('aqar.filters.furnished.yes', 'Furnished')}</option>
                <option value="no">{t('aqar.filters.furnished.no', 'Unfurnished')}</option>
                <option value="partial">{t('aqar.filters.furnished.partial', 'Partially Furnished')}</option>
              </select>
            </div>

            {/* Available From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline-block w-4 h-4 mr-2" />
                {t('aqar.filters.availableFrom', 'Available From')}
              </label>
              <input
                type="date"
                value={filters.availableFrom}
                onChange={(e) => handleFilterChange('availableFrom', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-8 justify-end">
            <button
              onClick={handleReset}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('aqar.filters.reset', 'Reset Filters')}
            </button>
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              {t('aqar.filters.search', 'Search Properties')}
            </button>
          </div>
        </div>

        {/* Quick Filter Presets */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('aqar.filters.quickFilters', 'Quick Filters')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => {
                setFilters({ ...filters, propertyType: 'apartment', city: 'riyadh', bedrooms: '2' });
              }}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              {t('aqar.filters.preset.familyApartment', '2BR Apartment in Riyadh')}
            </button>
            <button
              onClick={() => {
                setFilters({ ...filters, propertyType: 'villa', bedrooms: '4', city: 'jeddah' });
              }}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              {t('aqar.filters.preset.luxuryVilla', 'Luxury Villa in Jeddah')}
            </button>
            <button
              onClick={() => {
                setFilters({ ...filters, propertyType: 'studio', maxPrice: '50000' });
              }}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              {t('aqar.filters.preset.affordableStudio', 'Affordable Studio')}
            </button>
            <button
              onClick={() => {
                setFilters({ ...filters, propertyType: 'office', city: 'riyadh' });
              }}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              {t('aqar.filters.preset.commercialOffice', 'Commercial Office')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
