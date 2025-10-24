'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, X, MapPin, Home, Bed, Bath, DollarSign, Grid3x3 } from 'lucide-react';

export interface SearchFiltersProps {
  onFilterChange?: (filters: PropertyFilters) => void;
  initialFilters?: PropertyFilters;
}

export interface PropertyFilters {
  search?: string;
  propertyTypes?: string[];
  listingType?: 'SALE' | 'RENT' | 'LEASE' | 'ALL';
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number[];
  bathrooms?: number[];
  areaMin?: number;
  areaMax?: number;
  city?: string;
  district?: string;
  amenities?: string[];
  furnished?: boolean | null;
  featured?: boolean;
  verified?: boolean;
  sortBy?: 'PRICE_ASC' | 'PRICE_DESC' | 'DATE_DESC' | 'AREA_DESC' | 'POPULAR';
}

const propertyTypes = [
  { value: 'APARTMENT', label: 'Apartment', icon: '🏢' },
  { value: 'VILLA', label: 'Villa', icon: '🏡' },
  { value: 'TOWNHOUSE', label: 'Townhouse', icon: '🏘️' },
  { value: 'PENTHOUSE', label: 'Penthouse', icon: '🏙️' },
  { value: 'STUDIO', label: 'Studio', icon: '🏠' },
  { value: 'LAND', label: 'Land', icon: '🗺️' },
  { value: 'COMMERCIAL', label: 'Commercial', icon: '🏪' },
  { value: 'WAREHOUSE', label: 'Warehouse', icon: '🏭' },
  { value: 'OFFICE', label: 'Office', icon: '🏢' },
];

const amenitiesList = [
  'Swimming Pool', 'Gym', 'Parking', 'Security', 'Garden', 'Balcony',
  'Elevator', 'Central AC', 'Maid Room', 'Storage', 'Kids Area', 'BBQ Area'
];

const saudiCities = [
  'Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Dhahran',
  'Jubail', 'Tabuk', 'Abha', 'Khamis Mushait', 'Najran', 'Jazan'
];

export default function SearchFilters({ onFilterChange, initialFilters }: SearchFiltersProps) {
  const [filters, setFilters] = useState<PropertyFilters>(initialFilters || {
    listingType: 'ALL',
    sortBy: 'DATE_DESC',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const updateFilters = (updates: Partial<PropertyFilters>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };

  const togglePropertyType = (type: string) => {
    const current = filters.propertyTypes || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    updateFilters({ propertyTypes: updated });
  };

  const toggleAmenity = (amenity: string) => {
    const current = filters.amenities || [];
    const updated = current.includes(amenity)
      ? current.filter((a) => a !== amenity)
      : [...current, amenity];
    updateFilters({ amenities: updated });
  };

  const toggleBedrooms = (count: number) => {
    const current = filters.bedrooms || [];
    const updated = current.includes(count)
      ? current.filter((b) => b !== count)
      : [...current, count];
    updateFilters({ bedrooms: updated });
  };

  const toggleBathrooms = (count: number) => {
    const current = filters.bathrooms || [];
    const updated = current.includes(count)
      ? current.filter((b) => b !== count)
      : [...current, count];
    updateFilters({ bathrooms: updated });
  };

  const clearFilters = () => {
    const cleared = {
      listingType: 'ALL' as const,
      sortBy: 'DATE_DESC' as const,
    };
    setFilters(cleared);
    if (onFilterChange) {
      onFilterChange(cleared);
    }
  };

  const activeFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.propertyTypes && filters.propertyTypes.length > 0) count++;
    if (filters.listingType && filters.listingType !== 'ALL') count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.bedrooms && filters.bedrooms.length > 0) count++;
    if (filters.bathrooms && filters.bathrooms.length > 0) count++;
    if (filters.areaMin || filters.areaMax) count++;
    if (filters.city) count++;
    if (filters.amenities && filters.amenities.length > 0) count++;
    if (filters.furnished !== null && filters.furnished !== undefined) count++;
    if (filters.featured) count++;
    if (filters.verified) count++;
    return count;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by location, property name, or keyword..."
          value={filters.search || ''}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB400] focus:border-transparent"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => updateFilters({ listingType: 'ALL' })}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            filters.listingType === 'ALL'
              ? 'bg-[#FFB400] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => updateFilters({ listingType: 'SALE' })}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            filters.listingType === 'SALE'
              ? 'bg-[#FFB400] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          For Sale
        </button>
        <button
          onClick={() => updateFilters({ listingType: 'RENT' })}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            filters.listingType === 'RENT'
              ? 'bg-[#FFB400] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          For Rent
        </button>
        <button
          onClick={() => updateFilters({ listingType: 'LEASE' })}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            filters.listingType === 'LEASE'
              ? 'bg-[#FFB400] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          For Lease
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters</span>
          {activeFilterCount() > 0 && (
            <span className="bg-[#FF8C00] text-white text-xs px-2 py-0.5 rounded-full">
              {activeFilterCount()}
            </span>
          )}
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border-t border-gray-200 pt-4 space-y-6">
          {/* Property Type */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Home className="w-4 h-4" />
              Property Type
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {propertyTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => togglePropertyType(type.value)}
                  className={`p-3 rounded-lg border-2 text-center transition-colors ${
                    filters.propertyTypes?.includes(type.value)
                      ? 'border-[#FFB400] bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-xs font-medium">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Price Range (SAR)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Minimum</label>
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceMin || ''}
                  onChange={(e) => updateFilters({ priceMin: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB400] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Maximum</label>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceMax || ''}
                  onChange={(e) => updateFilters({ priceMax: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB400] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Bedrooms */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Bed className="w-4 h-4" />
              Bedrooms
            </h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((count) => (
                <button
                  key={count}
                  onClick={() => toggleBedrooms(count)}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    filters.bedrooms?.includes(count)
                      ? 'border-[#FFB400] bg-orange-50 text-gray-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {count === 5 ? '5+' : count}
                </button>
              ))}
            </div>
          </div>

          {/* Bathrooms */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Bath className="w-4 h-4" />
              Bathrooms
            </h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  onClick={() => toggleBathrooms(count)}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    filters.bathrooms?.includes(count)
                      ? 'border-[#FFB400] bg-orange-50 text-gray-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {count === 4 ? '4+' : count}
                </button>
              ))}
            </div>
          </div>

          {/* Area Range */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Grid3x3 className="w-4 h-4" />
              Area (sqm)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Minimum</label>
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.areaMin || ''}
                  onChange={(e) => updateFilters({ areaMin: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB400] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Maximum</label>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.areaMax || ''}
                  onChange={(e) => updateFilters({ areaMax: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB400] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">City</label>
                <select
                  value={filters.city || ''}
                  onChange={(e) => updateFilters({ city: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB400] focus:border-transparent"
                >
                  <option value="">All Cities</option>
                  {saudiCities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">District</label>
                <input
                  type="text"
                  placeholder="Enter district"
                  value={filters.district || ''}
                  onChange={(e) => updateFilters({ district: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB400] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Amenities</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {amenitiesList.map((amenity) => (
                <label
                  key={amenity}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.amenities?.includes(amenity)}
                    onChange={() => toggleAmenity(amenity)}
                    className="w-4 h-4 text-[#FFB400] border-gray-300 rounded focus:ring-[#FFB400]"
                  />
                  <span className="text-sm text-gray-700">{amenity}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Additional Options</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.furnished || false}
                  onChange={(e) => updateFilters({ furnished: e.target.checked || null })}
                  className="w-4 h-4 text-[#FFB400] border-gray-300 rounded focus:ring-[#FFB400]"
                />
                <span className="text-sm text-gray-700">Furnished</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.featured || false}
                  onChange={(e) => updateFilters({ featured: e.target.checked })}
                  className="w-4 h-4 text-[#FFB400] border-gray-300 rounded focus:ring-[#FFB400]"
                />
                <span className="text-sm text-gray-700">Featured Properties Only</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.verified || false}
                  onChange={(e) => updateFilters({ verified: e.target.checked })}
                  className="w-4 h-4 text-[#FFB400] border-gray-300 rounded focus:ring-[#FFB400]"
                />
                <span className="text-sm text-gray-700">Verified Properties Only</span>
              </label>
            </div>
          </div>

          {/* Sort By */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Sort By</h3>
            <select
              value={filters.sortBy || 'DATE_DESC'}
              onChange={(e) => updateFilters({ sortBy: e.target.value as PropertyFilters['sortBy'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB400] focus:border-transparent"
            >
              <option value="DATE_DESC">Newest First</option>
              <option value="PRICE_ASC">Price: Low to High</option>
              <option value="PRICE_DESC">Price: High to Low</option>
              <option value="AREA_DESC">Largest First</option>
              <option value="POPULAR">Most Popular</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={clearFilters}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Clear All
            </button>
            <button
              onClick={() => setShowAdvanced(false)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#FFB400] to-[#FF8C00] text-white rounded-lg hover:shadow-lg transition-shadow font-semibold"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {activeFilterCount() > 0 && !showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Active Filters:</span>
            {filters.listingType && filters.listingType !== 'ALL' && (
              <span className="px-3 py-1 bg-[#FFB400] text-white text-sm rounded-full flex items-center gap-1">
                {filters.listingType}
                <button onClick={() => updateFilters({ listingType: 'ALL' })}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(filters.propertyTypes?.length || 0) > 0 && (
              <span className="px-3 py-1 bg-[#FFB400] text-white text-sm rounded-full flex items-center gap-1">
                {filters.propertyTypes!.length} types
                <button onClick={() => updateFilters({ propertyTypes: [] })}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="ml-auto text-sm text-[#FF8C00] hover:text-[#FFB400] font-medium"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
