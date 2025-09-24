'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useI18n } from '@/src/providers/RootProviders';

// Saudi Arabia specific property types
const PROPERTY_TYPES = [
  { id: 'apartment', nameEn: 'Apartment', nameAr: 'شقة' },
  { id: 'villa', nameEn: 'Villa', nameAr: 'فيلا' },
  { id: 'townhouse', nameEn: 'Townhouse', nameAr: 'تاون هاوس' },
  { id: 'studio', nameEn: 'Studio', nameAr: 'استوديو' },
  { id: 'floor', nameEn: 'Floor', nameAr: 'دور' },
  { id: 'land', nameEn: 'Land', nameAr: 'أرض' },
  { id: 'office', nameEn: 'Office', nameAr: 'مكتب' },
  { id: 'shop', nameEn: 'Shop', nameAr: 'محل' },
  { id: 'chalet', nameEn: 'Chalet', nameAr: 'شاليه' },
  { id: 'farm', nameEn: 'Farm', nameAr: 'مزرعة' },
  { id: 'warehouse', nameEn: 'Warehouse', nameAr: 'مستودع' }
];

const AMENITIES = [
  { id: 'parking', nameEn: 'Parking', nameAr: 'موقف سيارات' },
  { id: 'elevator', nameEn: 'Elevator', nameAr: 'مصعد' },
  { id: 'balcony', nameEn: 'Balcony', nameAr: 'شرفة' },
  { id: 'maid_room', nameEn: 'Maid Room', nameAr: 'غرفة خادمة' },
  { id: 'ac', nameEn: 'AC', nameAr: 'مكيف' },
  { id: 'pool', nameEn: 'Swimming Pool', nameAr: 'مسبح' },
  { id: 'security', nameEn: 'Security', nameAr: 'أمن' },
  { id: 'gym', nameEn: 'Gym', nameAr: 'صالة رياضية' },
  { id: 'garden', nameEn: 'Garden', nameAr: 'حديقة' }
];

const PURPOSES = [
  { id: 'rent', nameEn: 'For Rent', nameAr: 'للإيجار' },
  { id: 'sale', nameEn: 'For Sale', nameAr: 'للبيع' },
  { id: 'daily', nameEn: 'Daily Rent', nameAr: 'إيجار يومي' }
];

const FURNISH_OPTIONS = [
  { id: 'furnished', nameEn: 'Furnished', nameAr: 'مفروش' },
  { id: 'unfurnished', nameEn: 'Unfurnished', nameAr: 'غير مفروش' },
  { id: 'semi', nameEn: 'Semi-Furnished', nameAr: 'نصف مفروش' }
];

const SAUDI_CITIES = [
  { id: 'riyadh', nameEn: 'Riyadh', nameAr: 'الرياض' },
  { id: 'jeddah', nameEn: 'Jeddah', nameAr: 'جدة' },
  { id: 'makkah', nameEn: 'Makkah', nameAr: 'مكة المكرمة' },
  { id: 'madinah', nameEn: 'Madinah', nameAr: 'المدينة المنورة' },
  { id: 'dammam', nameEn: 'Dammam', nameAr: 'الدمام' },
  { id: 'khobar', nameEn: 'Khobar', nameAr: 'الخبر' },
  { id: 'dhahran', nameEn: 'Dhahran', nameAr: 'الظهران' },
  { id: 'jubail', nameEn: 'Jubail', nameAr: 'الجبيل' },
  { id: 'tabuk', nameEn: 'Tabuk', nameAr: 'تبوك' },
  { id: 'hail', nameEn: 'Hail', nameAr: 'حائل' },
  { id: 'abha', nameEn: 'Abha', nameAr: 'أبها' },
  { id: 'khamis_mushait', nameEn: 'Khamis Mushait', nameAr: 'خميس مشيط' }
];

const POSTED_OPTIONS = [
  { id: 'any', nameEn: 'Any Time', nameAr: 'أي وقت' },
  { id: '24h', nameEn: 'Last 24 Hours', nameAr: 'آخر 24 ساعة' },
  { id: '7d', nameEn: 'Last 7 Days', nameAr: 'آخر 7 أيام' },
  { id: '30d', nameEn: 'Last 30 Days', nameAr: 'آخر 30 يوم' }
];

export default function AqarFiltersSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { t, language, isRTL } = useI18n();

  // Filter states
  const [purpose, setPurpose] = useState(params.get('purpose') || 'rent');
  const [city, setCity] = useState(params.get('city') || '');
  const [district, setDistrict] = useState(params.get('district') || '');
  const [types, setTypes] = useState<string[]>(params.getAll('type') || []);
  const [minPrice, setMinPrice] = useState(params.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') || '');
  const [beds, setBeds] = useState(params.get('beds') || '');
  const [baths, setBaths] = useState(params.get('baths') || '');
  const [minArea, setMinArea] = useState(params.get('minArea') || '');
  const [maxArea, setMaxArea] = useState(params.get('maxArea') || '');
  const [furnish, setFurnish] = useState(params.get('furnish') || '');
  const [amenities, setAmenities] = useState<string[]>(params.getAll('amenity') || []);
  const [verified, setVerified] = useState(params.get('verified') === '1');
  const [posted, setPosted] = useState(params.get('posted') || 'any');

  // Apply filters
  const applyFilters = () => {
    const queryParams = new URLSearchParams();
    
    if (purpose) queryParams.set('purpose', purpose);
    if (city) queryParams.set('city', city);
    if (district) queryParams.set('district', district);
    types.forEach(t => queryParams.append('type', t));
    if (minPrice) queryParams.set('minPrice', minPrice);
    if (maxPrice) queryParams.set('maxPrice', maxPrice);
    if (beds) queryParams.set('beds', beds);
    if (baths) queryParams.set('baths', baths);
    if (minArea) queryParams.set('minArea', minArea);
    if (maxArea) queryParams.set('maxArea', maxArea);
    if (furnish) queryParams.set('furnish', furnish);
    amenities.forEach(a => queryParams.append('amenity', a));
    if (verified) queryParams.set('verified', '1');
    if (posted !== 'any') queryParams.set('posted', posted);

    router.push(`${pathname}?${queryParams.toString()}`);
  };

  // Reset filters
  const resetFilters = () => {
    setPurpose('rent');
    setCity('');
    setDistrict('');
    setTypes([]);
    setMinPrice('');
    setMaxPrice('');
    setBeds('');
    setBaths('');
    setMinArea('');
    setMaxArea('');
    setFurnish('');
    setAmenities([]);
    setVerified(false);
    setPosted('any');
    router.push(pathname);
  };

  // Toggle property type
  const toggleType = (type: string) => {
    setTypes(current => 
      current.includes(type) 
        ? current.filter(t => t !== type)
        : [...current, type]
    );
  };

  // Toggle amenity
  const toggleAmenity = (amenity: string) => {
    setAmenities(current => 
      current.includes(amenity) 
        ? current.filter(a => a !== amenity)
        : [...current, amenity]
    );
  };

  return (
    <aside className="w-80 bg-white border-e border-gray-200 p-4 overflow-y-auto max-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {language === 'ar' ? 'تصفية النتائج' : 'Filter Results'}
          </h3>
          <button
            onClick={resetFilters}
            className="text-sm text-[#0061A8] hover:text-[#0061A8]/80"
          >
            {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
          </button>
        </div>

        {/* Purpose */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'ar' ? 'الغرض' : 'Purpose'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PURPOSES.map(p => (
              <button
                key={p.id}
                onClick={() => setPurpose(p.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  purpose === p.id
                    ? 'bg-[#0061A8] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {language === 'ar' ? p.nameAr : p.nameEn}
              </button>
            ))}
          </div>
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'ar' ? 'المدينة' : 'City'}
          </label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#0061A8] focus:ring-[#0061A8]"
          >
            <option value="">{language === 'ar' ? 'اختر المدينة' : 'Select City'}</option>
            {SAUDI_CITIES.map(c => (
              <option key={c.id} value={c.id}>
                {language === 'ar' ? c.nameAr : c.nameEn}
              </option>
            ))}
          </select>
        </div>

        {/* District */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'ar' ? 'الحي' : 'District'}
          </label>
          <input
            type="text"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder={language === 'ar' ? 'أدخل اسم الحي' : 'Enter district name'}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#0061A8] focus:ring-[#0061A8]"
          />
        </div>

        {/* Property Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'ar' ? 'نوع العقار' : 'Property Type'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PROPERTY_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => toggleType(type.id)}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  types.includes(type.id)
                    ? 'bg-[#00A859] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {language === 'ar' ? type.nameAr : type.nameEn}
              </button>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'ar' ? 'السعر (ريال)' : 'Price (SAR)'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder={language === 'ar' ? 'من' : 'Min'}
              className="rounded-md border-gray-300 shadow-sm focus:border-[#0061A8] focus:ring-[#0061A8]"
            />
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder={language === 'ar' ? 'إلى' : 'Max'}
              className="rounded-md border-gray-300 shadow-sm focus:border-[#0061A8] focus:ring-[#0061A8]"
            />
          </div>
        </div>

        {/* Bedrooms & Bathrooms */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'ar' ? 'غرف النوم' : 'Bedrooms'}
            </label>
            <select
              value={beds}
              onChange={(e) => setBeds(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#0061A8] focus:ring-[#0061A8]"
            >
              <option value="">{language === 'ar' ? 'الكل' : 'Any'}</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5+">5+</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'ar' ? 'دورات المياه' : 'Bathrooms'}
            </label>
            <select
              value={baths}
              onChange={(e) => setBaths(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#0061A8] focus:ring-[#0061A8]"
            >
              <option value="">{language === 'ar' ? 'الكل' : 'Any'}</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4+">4+</option>
            </select>
          </div>
        </div>

        {/* Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'ar' ? 'المساحة (م²)' : 'Area (m²)'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={minArea}
              onChange={(e) => setMinArea(e.target.value)}
              placeholder={language === 'ar' ? 'من' : 'Min'}
              className="rounded-md border-gray-300 shadow-sm focus:border-[#0061A8] focus:ring-[#0061A8]"
            />
            <input
              type="number"
              value={maxArea}
              onChange={(e) => setMaxArea(e.target.value)}
              placeholder={language === 'ar' ? 'إلى' : 'Max'}
              className="rounded-md border-gray-300 shadow-sm focus:border-[#0061A8] focus:ring-[#0061A8]"
            />
          </div>
        </div>

        {/* Furnishing */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'ar' ? 'التأثيث' : 'Furnishing'}
          </label>
          <select
            value={furnish}
            onChange={(e) => setFurnish(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#0061A8] focus:ring-[#0061A8]"
          >
            <option value="">{language === 'ar' ? 'الكل' : 'Any'}</option>
            {FURNISH_OPTIONS.map(f => (
              <option key={f.id} value={f.id}>
                {language === 'ar' ? f.nameAr : f.nameEn}
              </option>
            ))}
          </select>
        </div>

        {/* Amenities */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'ar' ? 'المرافق' : 'Amenities'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {AMENITIES.map(amenity => (
              <label
                key={amenity.id}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={amenities.includes(amenity.id)}
                  onChange={() => toggleAmenity(amenity.id)}
                  className="rounded border-gray-300 text-[#0061A8] focus:ring-[#0061A8]"
                />
                <span className="text-gray-700">
                  {language === 'ar' ? amenity.nameAr : amenity.nameEn}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Posted Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'ar' ? 'تاريخ النشر' : 'Posted Date'}
          </label>
          <select
            value={posted}
            onChange={(e) => setPosted(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#0061A8] focus:ring-[#0061A8]"
          >
            {POSTED_OPTIONS.map(option => (
              <option key={option.id} value={option.id}>
                {language === 'ar' ? option.nameAr : option.nameEn}
              </option>
            ))}
          </select>
        </div>

        {/* Verified Only */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
              className="rounded border-gray-300 text-[#0061A8] focus:ring-[#0061A8]"
            />
            <span className="text-sm font-medium text-gray-700">
              {language === 'ar' ? 'معتمد فقط' : 'Verified Only'}
            </span>
          </label>
        </div>

        {/* Apply Button */}
        <div className="flex gap-2 pt-4">
          <button
            onClick={applyFilters}
            className="flex-1 py-2 px-4 bg-[#0061A8] text-white rounded-md hover:bg-[#0061A8]/90 transition-colors font-medium"
          >
            {language === 'ar' ? 'تطبيق' : 'Apply Filters'}
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
          >
            {language === 'ar' ? 'مسح' : 'Clear'}
          </button>
        </div>
      </div>
    </aside>
  );
}
