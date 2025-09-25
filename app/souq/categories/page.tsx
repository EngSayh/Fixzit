'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/src/providers/RootProviders';
import { ChevronRight, Grid3X3, List, Search, Filter } from 'lucide-react';

// Mock categories data - in production, this would come from API
const MAIN_CATEGORIES = [
  {
    id: 'electrical',
    name: { en: 'Electrical', ar: 'كهرباء' },
    icon: '⚡',
    subcategories: [
      { id: 'cables', name: { en: 'Cables & Wires', ar: 'الكابلات والأسلاك' }, count: 1250 },
      { id: 'breakers', name: { en: 'Circuit Breakers', ar: 'قواطع الدائرة' }, count: 890 },
      { id: 'panels', name: { en: 'Electrical Panels', ar: 'اللوحات الكهربائية' }, count: 456 },
      { id: 'switches', name: { en: 'Switches & Outlets', ar: 'المفاتيح والمنافذ' }, count: 2340 },
      { id: 'lighting', name: { en: 'Lighting Fixtures', ar: 'تركيبات الإضاءة' }, count: 3210 }
    ]
  },
  {
    id: 'plumbing',
    name: { en: 'Plumbing', ar: 'السباكة' },
    icon: '🚿',
    subcategories: [
      { id: 'pipes', name: { en: 'Pipes & Fittings', ar: 'الأنابيب والتجهيزات' }, count: 2100 },
      { id: 'valves', name: { en: 'Valves', ar: 'الصمامات' }, count: 780 },
      { id: 'fixtures', name: { en: 'Fixtures', ar: 'التركيبات' }, count: 1450 },
      { id: 'pumps', name: { en: 'Pumps', ar: 'المضخات' }, count: 340 }
    ]
  },
  {
    id: 'hvac',
    name: { en: 'HVAC', ar: 'التكييف والتهوية' },
    icon: '❄️',
    subcategories: [
      { id: 'ac-units', name: { en: 'AC Units', ar: 'وحدات التكييف' }, count: 560 },
      { id: 'filters', name: { en: 'Filters', ar: 'الفلاتر' }, count: 890 },
      { id: 'ducting', name: { en: 'Ducting', ar: 'مجاري الهواء' }, count: 320 },
      { id: 'thermostats', name: { en: 'Thermostats', ar: 'منظمات الحرارة' }, count: 120 }
    ]
  },
  {
    id: 'concrete',
    name: { en: 'Concrete & Cement', ar: 'الخرسانة والأسمنت' },
    icon: '🏗️',
    subcategories: [
      { id: 'cement', name: { en: 'Cement', ar: 'الأسمنت' }, count: 45 },
      { id: 'admixtures', name: { en: 'Admixtures', ar: 'الإضافات' }, count: 120 },
      { id: 'rebar', name: { en: 'Rebar & Mesh', ar: 'حديد التسليح' }, count: 230 },
      { id: 'blocks', name: { en: 'Concrete Blocks', ar: 'البلوك الخرساني' }, count: 80 }
    ]
  },
  {
    id: 'paints',
    name: { en: 'Paints & Coatings', ar: 'الدهانات والطلاءات' },
    icon: '🎨',
    subcategories: [
      { id: 'interior', name: { en: 'Interior Paints', ar: 'دهانات داخلية' }, count: 340 },
      { id: 'exterior', name: { en: 'Exterior Paints', ar: 'دهانات خارجية' }, count: 280 },
      { id: 'primers', name: { en: 'Primers', ar: 'الأساسات' }, count: 120 },
      { id: 'coatings', name: { en: 'Special Coatings', ar: 'طلاءات خاصة' }, count: 190 }
    ]
  },
  {
    id: 'ppe',
    name: { en: 'PPE & Safety', ar: 'معدات الحماية' },
    icon: '🦺',
    subcategories: [
      { id: 'helmets', name: { en: 'Safety Helmets', ar: 'خوذات السلامة' }, count: 120 },
      { id: 'gloves', name: { en: 'Safety Gloves', ar: 'قفازات السلامة' }, count: 450 },
      { id: 'shoes', name: { en: 'Safety Shoes', ar: 'أحذية السلامة' }, count: 230 },
      { id: 'harness', name: { en: 'Safety Harness', ar: 'أحزمة السلامة' }, count: 90 }
    ]
  },
  {
    id: 'tools',
    name: { en: 'Tools & Hardware', ar: 'الأدوات والعدد' },
    icon: '🔧',
    subcategories: [
      { id: 'power-tools', name: { en: 'Power Tools', ar: 'أدوات كهربائية' }, count: 890 },
      { id: 'hand-tools', name: { en: 'Hand Tools', ar: 'أدوات يدوية' }, count: 1200 },
      { id: 'fasteners', name: { en: 'Fasteners', ar: 'المثبتات' }, count: 3400 },
      { id: 'accessories', name: { en: 'Accessories', ar: 'الملحقات' }, count: 2100 }
    ]
  }
];

/**
 * Renders the Categories page UI for browsing product categories and subcategories.
 *
 * Displays categories in either a grid or list view, supports live search (filters categories and subcategories
 * by the current language with English fallback), and allows expanding a category to reveal its subcategories.
 * Also includes a Featured Brands section and quick links (RFQ, Vendors, Support). The search input respects RTL
 * layout when applicable.
 *
 * @returns The page's React element tree.
 */
export default function CategoriesPage() {
  const { t, language, isRTL } = useI18n();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter categories based on search
  const filteredCategories = MAIN_CATEGORIES.filter(cat => {
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = cat.name[language]?.toLowerCase().includes(searchLower) ||
                      cat.name.en.toLowerCase().includes(searchLower);
    const subMatch = cat.subcategories.some(sub => 
      sub.name[language]?.toLowerCase().includes(searchLower) ||
      sub.name.en.toLowerCase().includes(searchLower)
    );
    return nameMatch || subMatch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('marketplace.categories', 'Product Categories')}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {t('marketplace.browseCatalog', 'Browse our extensive catalog of construction materials')}
              </p>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[#0061A8] text-white' : 'bg-gray-100'}`}
                aria-label="Grid view"
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-[#0061A8] text-white' : 'bg-gray-100'}`}
                aria-label="List view"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('marketplace.searchCategories', 'Search categories or products...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
        </div>
      </div>

      {/* Categories Grid/List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
                onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-4xl">{category.icon}</span>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transform transition-transform ${
                      selectedCategory === category.id ? 'rotate-90' : ''
                    }`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {category.name[language] || category.name.en}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {category.subcategories.length} {t('marketplace.subcategories', 'subcategories')}
                  </p>
                </div>

                {/* Expanded Subcategories */}
                {selectedCategory === category.id && (
                  <div className="border-t px-6 py-4 bg-gray-50">
                    <ul className="space-y-2">
                      {category.subcategories.map((sub) => (
                        <li key={sub.id}>
                          <Link
                            href={`/souq/search?category=${category.id}&subcategory=${sub.id}`}
                            className="flex items-center justify-between text-sm hover:text-[#0061A8] transition-colors"
                          >
                            <span>{sub.name[language] || sub.name.en}</span>
                            <span className="text-gray-400">({sub.count})</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCategories.map((category) => (
              <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{category.icon}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {category.name[language] || category.name.en}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {category.subcategories.reduce((acc, sub) => acc + sub.count, 0)} {t('marketplace.products', 'products')}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transform transition-transform ${
                      selectedCategory === category.id ? 'rotate-90' : ''
                    }`} />
                  </div>
                </div>

                {/* Expanded Subcategories - List View */}
                {selectedCategory === category.id && (
                  <div className="border-t bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                      {category.subcategories.map((sub) => (
                        <Link
                          key={sub.id}
                          href={`/souq/search?category=${category.id}&subcategory=${sub.id}`}
                          className="bg-white p-4 rounded border border-gray-200 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">
                              {sub.name[language] || sub.name.en}
                            </span>
                            <span className="text-sm text-[#00A859] font-semibold">
                              {sub.count}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Featured Brands Section */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {t('marketplace.featuredBrands', 'Featured Brands')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {['3M', 'Schneider', 'ABB', 'Siemens', 'Honeywell', 'Legrand'].map((brand) => (
              <Link
                key={brand}
                href={`/souq/search?brand=${brand}`}
                className="border rounded-lg p-4 text-center hover:shadow-md transition-shadow"
              >
                <div className="h-12 flex items-center justify-center mb-2">
                  <span className="text-lg font-semibold text-gray-700">{brand}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#0061A8] rounded-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-4">
            {t('marketplace.needHelp', 'Need Help Finding Products?')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/souq/rfq" className="flex items-center gap-2 hover:underline">
              <span>→</span> {t('marketplace.submitRfq', 'Submit an RFQ')}
            </Link>
            <Link href="/souq/vendors" className="flex items-center gap-2 hover:underline">
              <span>→</span> {t('marketplace.browseVendors', 'Browse Vendors')}
            </Link>
            <Link href="/help" className="flex items-center gap-2 hover:underline">
              <span>→</span> {t('marketplace.contactSupport', 'Contact Support')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}