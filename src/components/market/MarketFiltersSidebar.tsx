'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useI18n } from '@/src/providers/RootProviders';
import { Star } from 'lucide-react';

// Department structure following Amazon-style categorization
const DEPARTMENTS = {
  hvac: {
    nameEn: 'HVAC & Cooling',
    nameAr: 'التكييف والتبريد',
    subcategories: ['Filters', 'Condensers', 'Thermostats', 'Ducting', 'Ventilation']
  },
  electrical: {
    nameEn: 'Electrical',
    nameAr: 'الكهرباء',
    subcategories: ['Breakers', 'Cables', 'Switches', 'Panels', 'Lighting']
  },
  plumbing: {
    nameEn: 'Plumbing',
    nameAr: 'السباكة',
    subcategories: ['Pipes', 'Fittings', 'Valves', 'Pumps', 'Water Heaters']
  },
  flooring: {
    nameEn: 'Flooring',
    nameAr: 'الأرضيات',
    subcategories: ['Tiles', 'Vinyl', 'Carpet', 'Wood', 'Laminate']
  },
  paint: {
    nameEn: 'Paint & Coatings',
    nameAr: 'الدهانات والطلاء',
    subcategories: ['Interior', 'Exterior', 'Primers', 'Stains', 'Specialty']
  },
  tools: {
    nameEn: 'Tools & Equipment',
    nameAr: 'الأدوات والمعدات',
    subcategories: ['Hand Tools', 'Power Tools', 'Ladders', 'Measuring', 'Storage']
  },
  safety: {
    nameEn: 'Safety Equipment',
    nameAr: 'معدات السلامة',
    subcategories: ['PPE', 'Gloves', 'Helmets', 'Boots', 'Eye Protection']
  },
  cleaning: {
    nameEn: 'Cleaning Supplies',
    nameAr: 'مستلزمات التنظيف',
    subcategories: ['Chemicals', 'Mops', 'Vacuum', 'Paper Products', 'Equipment']
  },
  smart: {
    nameEn: 'Smart Building',
    nameAr: 'المباني الذكية',
    subcategories: ['Sensors', 'Controllers', 'Automation', 'Access Control', 'CCTV']
  },
  outdoor: {
    nameEn: 'Landscaping',
    nameAr: 'تنسيق الحدائق',
    subcategories: ['Irrigation', 'Plants', 'Tools', 'Furniture', 'Lighting']
  }
};

const BRANDS = [
  'Carrier', 'Daikin', 'LG', 'Samsung', 'Honeywell', 
  'Schneider', 'Siemens', 'ABB', 'Bosch', '3M',
  'Makita', 'DeWalt', 'Stanley', 'Legrand', 'Trane'
];

const DELIVERY_OPTIONS = [
  { id: 'same_day', nameEn: 'Same Day', nameAr: 'نفس اليوم' },
  { id: 'next_day', nameEn: 'Next Day', nameAr: 'اليوم التالي' },
  { id: 'free_shipping', nameEn: 'Free Shipping', nameAr: 'شحن مجاني' },
  { id: 'prime', nameEn: 'Prime Eligible', nameAr: 'مؤهل للبرايم' }
];

const CONDITION_OPTIONS = [
  { id: 'new', nameEn: 'New', nameAr: 'جديد' },
  { id: 'used', nameEn: 'Used', nameAr: 'مستعمل' },
  { id: 'refurbished', nameEn: 'Refurbished', nameAr: 'مجدد' }
];

export default function MarketFiltersSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { t, language, isRTL } = useI18n();

  // Filter states
  const [department, setDepartment] = useState(params.get('dept') || '');
  const [selectedBrands, setSelectedBrands] = useState<string[]>(params.getAll('brand') || []);
  const [minPrice, setMinPrice] = useState(params.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') || '');
  const [rating, setRating] = useState(params.get('rating') || '');
  const [stockOnly, setStockOnly] = useState(params.get('stock') === '1');
  const [delivery, setDelivery] = useState<string[]>(params.getAll('delivery') || []);
  const [condition, setCondition] = useState(params.get('condition') || '');
  const [discount, setDiscount] = useState(params.get('discount') === '1');
  const [sellerType, setSellerType] = useState(params.get('seller') || '');

  // Apply filters
  const applyFilters = () => {
    const queryParams = new URLSearchParams();
    
    if (department) queryParams.set('dept', department);
    selectedBrands.forEach(b => queryParams.append('brand', b));
    if (minPrice) queryParams.set('minPrice', minPrice);
    if (maxPrice) queryParams.set('maxPrice', maxPrice);
    if (rating) queryParams.set('rating', rating);
    if (stockOnly) queryParams.set('stock', '1');
    delivery.forEach(d => queryParams.append('delivery', d));
    if (condition) queryParams.set('condition', condition);
    if (discount) queryParams.set('discount', '1');
    if (sellerType) queryParams.set('seller', sellerType);

    router.push(`${pathname}?${queryParams.toString()}`);
  };

  // Reset filters
  const resetFilters = () => {
    setDepartment('');
    setSelectedBrands([]);
    setMinPrice('');
    setMaxPrice('');
    setRating('');
    setStockOnly(false);
    setDelivery([]);
    setCondition('');
    setDiscount(false);
    setSellerType('');
    router.push(pathname);
  };

  // Toggle brand selection
  const toggleBrand = (brand: string) => {
    setSelectedBrands(current => 
      current.includes(brand) 
        ? current.filter(b => b !== brand)
        : [...current, brand]
    );
  };

  // Toggle delivery option
  const toggleDelivery = (option: string) => {
    setDelivery(current => 
      current.includes(option) 
        ? current.filter(d => d !== option)
        : [...current, option]
    );
  };

  // Render star rating
  const renderStars = (count: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < count ? 'fill-[#FFB400] text-[#FFB400]' : 'fill-gray-200 text-gray-200'}`}
      />
    ));
  };

  return (
    <aside className="w-80 bg-white border-e border-gray-200 p-4 overflow-y-auto max-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {language === 'ar' ? 'تصفية المنتجات' : 'Filter Products'}
          </h3>
          <button
            onClick={resetFilters}
            className="text-sm text-[#0061A8] hover:text-[#0061A8]/80"
          >
            {language === 'ar' ? 'مسح الكل' : 'Clear All'}
          </button>
        </div>

        {/* Department */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'ar' ? 'القسم' : 'Department'}
          </label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#0061A8] focus:ring-[#0061A8]"
          >
            <option value="">{language === 'ar' ? 'جميع الأقسام' : 'All Departments'}</option>
            {Object.entries(DEPARTMENTS).map(([key, dept]) => (
              <option key={key} value={key}>
                {language === 'ar' ? dept.nameAr : dept.nameEn}
              </option>
            ))}
          </select>
          {department && DEPARTMENTS[department as keyof typeof DEPARTMENTS] && (
            <div className="mt-2 text-xs text-gray-600">
              {language === 'ar' ? 'الفئات الفرعية: ' : 'Subcategories: '}
              {DEPARTMENTS[department as keyof typeof DEPARTMENTS].subcategories.join(', ')}
            </div>
          )}
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

        {/* Customer Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'ar' ? 'تقييم العملاء' : 'Customer Rating'}
          </label>
          <div className="space-y-2">
            {[4, 3, 2, 1].map(stars => (
              <label
                key={stars}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
              >
                <input
                  type="radio"
                  name="rating"
                  value={stars}
                  checked={rating === String(stars)}
                  onChange={(e) => setRating(e.target.value)}
                  className="text-[#0061A8] focus:ring-[#0061A8]"
                />
                <div className="flex items-center gap-1">
                  {renderStars(stars)}
                  <span className="text-sm text-gray-600 ms-1">
                    {language === 'ar' ? 'وأعلى' : '& up'}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Brands */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'ar' ? 'العلامة التجارية' : 'Brand'}
          </label>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {BRANDS.map(brand => (
              <label
                key={brand}
                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand)}
                  onChange={() => toggleBrand(brand)}
                  className="rounded border-gray-300 text-[#0061A8] focus:ring-[#0061A8]"
                />
                <span className="text-gray-700">{brand}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Delivery Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'ar' ? 'خيارات التوصيل' : 'Delivery Options'}
          </label>
          <div className="space-y-1">
            {DELIVERY_OPTIONS.map(option => (
              <label
                key={option.id}
                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={delivery.includes(option.id)}
                  onChange={() => toggleDelivery(option.id)}
                  className="rounded border-gray-300 text-[#0061A8] focus:ring-[#0061A8]"
                />
                <span className="text-gray-700">
                  {language === 'ar' ? option.nameAr : option.nameEn}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Condition */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'ar' ? 'الحالة' : 'Condition'}
          </label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#0061A8] focus:ring-[#0061A8]"
          >
            <option value="">{language === 'ar' ? 'الكل' : 'Any'}</option>
            {CONDITION_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>
                {language === 'ar' ? opt.nameAr : opt.nameEn}
              </option>
            ))}
          </select>
        </div>

        {/* Additional Filters */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={stockOnly}
              onChange={(e) => setStockOnly(e.target.checked)}
              className="rounded border-gray-300 text-[#0061A8] focus:ring-[#0061A8]"
            />
            <span className="text-sm text-gray-700">
              {language === 'ar' ? 'متوفر في المخزون فقط' : 'In Stock Only'}
            </span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={discount}
              onChange={(e) => setDiscount(e.target.checked)}
              className="rounded border-gray-300 text-[#0061A8] focus:ring-[#0061A8]"
            />
            <span className="text-sm text-gray-700">
              {language === 'ar' ? 'العروض والخصومات' : 'Deals & Discounts'}
            </span>
          </label>
        </div>

        {/* Seller Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'ar' ? 'نوع البائع' : 'Seller Type'}
          </label>
          <select
            value={sellerType}
            onChange={(e) => setSellerType(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#0061A8] focus:ring-[#0061A8]"
          >
            <option value="">{language === 'ar' ? 'الكل' : 'All'}</option>
            <option value="fixzit">{language === 'ar' ? 'فيكزت' : 'Fixzit'}</option>
            <option value="verified">{language === 'ar' ? 'بائع معتمد' : 'Verified Seller'}</option>
            <option value="partner">{language === 'ar' ? 'شريك' : 'Partner'}</option>
          </select>
        </div>

        {/* Apply Button */}
        <div className="flex gap-2 pt-4 border-t">
          <button
            onClick={applyFilters}
            className="flex-1 py-2 px-4 bg-[#0061A8] text-white rounded-md hover:bg-[#0061A8]/90 transition-colors font-medium"
          >
            {language === 'ar' ? 'تطبيق الفلاتر' : 'Apply Filters'}
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
          >
            {language === 'ar' ? 'مسح' : 'Clear'}
          </button>
        </div>

        {/* Filter Summary */}
        {(selectedBrands.length > 0 || delivery.length > 0) && (
          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500 mb-2">
              {language === 'ar' ? 'الفلاتر النشطة:' : 'Active Filters:'}
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedBrands.map(brand => (
                <span
                  key={brand}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-xs rounded-full"
                >
                  {brand}
                  <button
                    onClick={() => toggleBrand(brand)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </span>
              ))}
              {delivery.map(d => {
                const option = DELIVERY_OPTIONS.find(opt => opt.id === d);
                return option ? (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-xs rounded-full"
                  >
                    {language === 'ar' ? option.nameAr : option.nameEn}
                    <button
                      onClick={() => toggleDelivery(d)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
