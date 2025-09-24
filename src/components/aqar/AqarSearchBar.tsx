'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Filter, Heart } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface SearchFilters {
  purpose: 'sale' | 'rent' | 'daily';
  propertyType: string;
  city: string;
  district: string;
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
  bedrooms: string;
  bathrooms: string;
  furnished: boolean | null;
  keywords: string;
}

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'شقق', labelEn: 'Apartments' },
  { value: 'villa', label: 'فلل', labelEn: 'Villas' },
  { value: 'land', label: 'أراضي', labelEn: 'Land' },
  { value: 'office', label: 'مكاتب', labelEn: 'Offices' },
  { value: 'shop', label: 'محلات', labelEn: 'Shops' },
  { value: 'building', label: 'عمائر', labelEn: 'Buildings' },
  { value: 'floor', label: 'أدوار', labelEn: 'Floors' },
  { value: 'room', label: 'غرف', labelEn: 'Rooms' }
];

const CITIES = [
  'الرياض', 'جدة', 'الدمام', 'الخبر', 'الظهران', 'القطيف', 'الأحساء',
  'الطائف', 'بريدة', 'تبوك', 'حائل', 'الباحة', 'نجران', 'جازان',
  'عرعر', 'سكاكا', 'الحدود الشمالية'
];

export default function AqarSearchBar({ lang = 'ar' }: { lang?: 'ar' | 'en' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<SearchFilters>({
    purpose: 'sale',
    propertyType: '',
    city: '',
    district: '',
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: '',
    bedrooms: '',
    bathrooms: '',
    furnished: null,
    keywords: ''
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    // Initialize filters from URL params
    setFilters({
      purpose: (searchParams.get('purpose') as 'sale' | 'rent' | 'daily') || 'sale',
      propertyType: searchParams.get('propertyType') || '',
      city: searchParams.get('city') || '',
      district: searchParams.get('district') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      minArea: searchParams.get('minArea') || '',
      maxArea: searchParams.get('maxArea') || '',
      bedrooms: searchParams.get('bedrooms') || '',
      bathrooms: searchParams.get('bathrooms') || '',
      furnished: searchParams.get('furnished') === 'true' ? true : 
                 searchParams.get('furnished') === 'false' ? false : null,
      keywords: searchParams.get('keywords') || ''
    });
  }, [searchParams]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        params.set(key, String(value));
      }
    });
    
    router.push(`/aqar?${params.toString()}`);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const t = (ar: string, en: string) => lang === 'ar' ? ar : en;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Purpose Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { value: 'sale', label: 'للبيع', labelEn: 'For Sale' },
          { value: 'rent', label: 'للإيجار', labelEn: 'For Rent' },
          { value: 'daily', label: 'إيجار يومي', labelEn: 'Daily Rent' }
        ].map(({ value, label, labelEn }) => (
          <button
            key={value}
            onClick={() => handleFilterChange('purpose', value)}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              filters.purpose === value
                ? 'bg-[#0061A8] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t(label, labelEn)}
          </button>
        ))}
      </div>

      {/* Main Search Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Property Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('نوع العقار', 'Property Type')}
          </label>
          <select
            value={filters.propertyType}
            onChange={(e) => handleFilterChange('propertyType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
          >
            <option value="">{t('جميع الأنواع', 'All Types')}</option>
            {PROPERTY_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {t(type.label, type.labelEn)}
              </option>
            ))}
          </select>
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('المدينة', 'City')}
          </label>
          <select
            value={filters.city}
            onChange={(e) => handleFilterChange('city', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
          >
            <option value="">{t('جميع المدن', 'All Cities')}</option>
            {CITIES.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        {/* District */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('الحي', 'District')}
          </label>
          <input
            type="text"
            value={filters.district}
            onChange={(e) => handleFilterChange('district', e.target.value)}
            placeholder={t('اسم الحي', 'District name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
          />
        </div>

        {/* Keywords */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('كلمات البحث', 'Keywords')}
          </label>
          <input
            type="text"
            value={filters.keywords}
            onChange={(e) => handleFilterChange('keywords', e.target.value)}
            placeholder={t('ابحث عن...', 'Search for...')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
          />
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 pt-4 border-t border-gray-200">
          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('السعر من', 'Price From')}
            </label>
            <input
              type="number"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              placeholder={t('الحد الأدنى', 'Min price')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('السعر إلى', 'Price To')}
            </label>
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              placeholder={t('الحد الأعلى', 'Max price')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            />
          </div>

          {/* Area Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('المساحة من', 'Area From')} (م²)
            </label>
            <input
              type="number"
              value={filters.minArea}
              onChange={(e) => handleFilterChange('minArea', e.target.value)}
              placeholder={t('الحد الأدنى', 'Min area')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('المساحة إلى', 'Area To')} (م²)
            </label>
            <input
              type="number"
              value={filters.maxArea}
              onChange={(e) => handleFilterChange('maxArea', e.target.value)}
              placeholder={t('الحد الأعلى', 'Max area')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            />
          </div>

          {/* Bedrooms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('غرف النوم', 'Bedrooms')}
            </label>
            <select
              value={filters.bedrooms}
              onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            >
              <option value="">{t('أي عدد', 'Any')}</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                <option key={num} value={num}>{num}+</option>
              ))}
            </select>
          </div>

          {/* Bathrooms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('دورات المياه', 'Bathrooms')}
            </label>
            <select
              value={filters.bathrooms}
              onChange={(e) => handleFilterChange('bathrooms', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            >
              <option value="">{t('أي عدد', 'Any')}</option>
              {[1, 2, 3, 4, 5, 6].map(num => (
                <option key={num} value={num}>{num}+</option>
              ))}
            </select>
          </div>

          {/* Furnished */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('مفروش', 'Furnished')}
            </label>
            <select
              value={filters.furnished === null ? '' : String(filters.furnished)}
              onChange={(e) => handleFilterChange('furnished', e.target.value === '' ? null : e.target.value === 'true')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            >
              <option value="">{t('أي', 'Any')}</option>
              <option value="true">{t('مفروش', 'Furnished')}</option>
              <option value="false">{t('غير مفروش', 'Unfurnished')}</option>
            </select>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSearch}
          className="flex items-center gap-2 px-6 py-3 bg-[#0061A8] text-white rounded-lg hover:bg-[#0056a3] transition-colors font-medium"
        >
          <Search className="w-5 h-5" />
          {t('بحث', 'Search')}
        </button>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          <Filter className="w-5 h-5" />
          {t('فلتر متقدم', 'Advanced Filters')}
        </button>

        <button
          onClick={() => router.push('/aqar/map')}
          className="flex items-center gap-2 px-6 py-3 bg-[#00A859] text-white rounded-lg hover:bg-[#00954d] transition-colors font-medium"
        >
          <MapPin className="w-5 h-5" />
          {t('بحث بالخريطة', 'Map Search')}
        </button>

        <button
          onClick={() => router.push('/aqar/saved')}
          className="flex items-center gap-2 px-6 py-3 bg-[#FFB400] text-black rounded-lg hover:bg-[#e6a200] transition-colors font-medium"
        >
          <Heart className="w-5 h-5" />
          {t('البحث المحفوظ', 'Saved Searches')}
        </button>
      </div>
    </div>
  );
}