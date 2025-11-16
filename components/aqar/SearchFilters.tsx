'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, X, MapPin, Home, Bed, Bath, DollarSign, Grid3x3 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

/* eslint-disable no-unused-vars */
export interface SearchFiltersProps {
  onFilterChange?: (filters: PropertyFilters) => void;
  initialFilters?: PropertyFilters;
}
/* eslint-enable no-unused-vars */

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

export default function SearchFilters({ onFilterChange, initialFilters }: SearchFiltersProps) {
  const { t } = useTranslation();
  
  const [filters, setFilters] = useState<PropertyFilters>(initialFilters || {
    listingType: 'ALL',
    sortBy: 'DATE_DESC',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Accessibility: Focus management
  const filtersButtonRef = useRef<HTMLButtonElement>(null);
  const advancedFiltersRef = useRef<HTMLDivElement>(null);
  
  // Accessibility: Keyboard navigation - Close advanced filters with Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAdvanced) {
        setShowAdvanced(false);
        // Restore focus to the filters button
        filtersButtonRef.current?.focus();
      }
    };
    
    if (showAdvanced) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showAdvanced]);
  
  const propertyTypes = [
    { value: 'APARTMENT', label: t('aqar.propertyTypes.apartment', 'Apartment'), icon: '🏢' },
    { value: 'VILLA', label: t('aqar.propertyTypes.villa', 'Villa'), icon: '🏡' },
    { value: 'TOWNHOUSE', label: t('aqar.propertyTypes.townhouse', 'Townhouse'), icon: '🏘️' },
    { value: 'PENTHOUSE', label: t('aqar.propertyTypes.penthouse', 'Penthouse'), icon: '🏙️' },
    { value: 'STUDIO', label: t('aqar.propertyTypes.studio', 'Studio'), icon: '🏠' },
    { value: 'LAND', label: t('aqar.propertyTypes.land', 'Land'), icon: '🗺️' },
    { value: 'COMMERCIAL', label: t('aqar.propertyTypes.commercial', 'Commercial'), icon: '🏪' },
    { value: 'WAREHOUSE', label: t('aqar.propertyTypes.warehouse', 'Warehouse'), icon: '🏭' },
    { value: 'OFFICE', label: t('aqar.propertyTypes.office', 'Office'), icon: '🏢' },
  ];

  const amenitiesList = [
    t('aqar.amenitiesList.swimmingPool', 'Swimming Pool'),
    t('aqar.amenitiesList.gym', 'Gym'),
    t('aqar.amenitiesList.parking', 'Parking'),
    t('aqar.amenitiesList.security', 'Security'),
    t('aqar.amenitiesList.garden', 'Garden'),
    t('aqar.amenitiesList.balcony', 'Balcony'),
    t('aqar.amenitiesList.elevator', 'Elevator'),
    t('aqar.amenitiesList.centralAc', 'Central AC'),
    t('aqar.amenitiesList.maidRoom', 'Maid Room'),
    t('aqar.amenitiesList.storage', 'Storage'),
    t('aqar.amenitiesList.kidsArea', 'Kids Area'),
    t('aqar.amenitiesList.bbqArea', 'BBQ Area'),
  ];

  const saudiCities = [
    t('aqar.cities.riyadh', 'Riyadh'),
    t('aqar.cities.jeddah', 'Jeddah'),
    t('aqar.cities.mecca', 'Mecca'),
    t('aqar.cities.medina', 'Medina'),
    t('aqar.cities.dammam', 'Dammam'),
    t('aqar.cities.khobar', 'Khobar'),
    t('aqar.cities.dhahran', 'Dhahran'),
    t('aqar.cities.jubail', 'Jubail'),
    t('aqar.cities.tabuk', 'Tabuk'),
    t('aqar.cities.abha', 'Abha'),
    t('aqar.cities.khamisMushait', 'Khamis Mushait'),
    t('aqar.cities.najran', 'Najran'),
    t('aqar.cities.jazan', 'Jazan'),
  ];

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
    <div className="bg-card rounded-2xl shadow-md p-4">
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder={t('aqar.filters.search', 'Search by location, property name, or keyword...')}
          value={filters.search || ''}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="w-full ps-10 pe-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => updateFilters({ listingType: 'ALL' })}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            filters.listingType === 'ALL'
              ? 'bg-warning text-white'
              : 'bg-muted text-foreground hover:bg-muted'
          }`}
        >
          {t('aqar.filters.all', 'All')}
        </button>
        <button
          onClick={() => updateFilters({ listingType: 'SALE' })}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            filters.listingType === 'SALE'
              ? 'bg-warning text-white'
              : 'bg-muted text-foreground hover:bg-muted'
          }`}
        >
          {t('aqar.filters.forSale', 'For Sale')}
        </button>
        <button
          onClick={() => updateFilters({ listingType: 'RENT' })}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            filters.listingType === 'RENT'
              ? 'bg-warning text-white'
              : 'bg-muted text-foreground hover:bg-muted'
          }`}
        >
          {t('aqar.filters.forRent', 'For Rent')}
        </button>
        <button
          onClick={() => updateFilters({ listingType: 'LEASE' })}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            filters.listingType === 'LEASE'
              ? 'bg-warning text-white'
              : 'bg-muted text-foreground hover:bg-muted'
          }`}
        >
          {t('aqar.filters.forLease', 'For Lease')}
        </button>
        <div className="flex-1" />
        <button
          ref={filtersButtonRef}
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
          aria-controls="advanced-filters"
          aria-label={t('aqar.filters.toggleFilters', `${showAdvanced ? 'Hide' : 'Show'} advanced filters${activeFilterCount() > 0 ? ` (${activeFilterCount()} active)` : ''}`)}
          className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted transition-colors whitespace-nowrap"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>{t('aqar.filters.filtersButton', 'Filters')}</span>
          {activeFilterCount() > 0 && (
            <span className="bg-warning text-white text-xs px-2 py-0.5 rounded-full" aria-live="polite">
              {activeFilterCount()}
            </span>
          )}
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div 
          id="advanced-filters"
          ref={advancedFiltersRef}
          role="region"
          aria-label={t('aqar.filters.advancedFiltersRegion', 'Advanced filters')}
          className="border-t border-border pt-4 space-y-6"
        >
          {/* Property Type */}
          <div>
            <h3 id="property-type-label" className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Home className="w-4 h-4" aria-hidden="true" />
              {t('aqar.filters.propertyType', 'Property Type')}
            </h3>
            <div 
              role="group" 
              aria-labelledby="property-type-label"
              className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2"
            >
              {propertyTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => togglePropertyType(type.value)}
                  role="checkbox"
                  aria-checked={filters.propertyTypes?.includes(type.value)}
                  aria-label={`${type.label} ${t('aqar.filters.propertyTypeOption', 'property type')}`}
                  className={`p-3 rounded-lg border-2 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-warning focus:ring-offset-2 ${
                    filters.propertyTypes?.includes(type.value)
                      ? 'border-warning bg-warning/10'
                      : 'border-border hover:border-border'
                  }`}
                >
                  <div className="text-2xl mb-1" aria-hidden="true">{type.icon}</div>
                  <div className="text-xs font-medium">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {t('aqar.filters.priceRange', 'Price Range (SAR)')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t('aqar.filters.minimum', 'Minimum')}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1000"
                  placeholder={t('aqar.filters.min', 'Min')}
                  aria-label={t('aqar.filters.minPriceInput', 'Minimum price')}
                  value={filters.priceMin || ''}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    if (value === '') {
                      updateFilters({ priceMin: undefined });
                    } else {
                      const parsed = Number(value);
                      if (Number.isFinite(parsed) && parsed >= 0) {
                        updateFilters({ priceMin: parsed });
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t('aqar.filters.maximum', 'Maximum')}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1000"
                  placeholder={t('aqar.filters.max', 'Max')}
                  aria-label={t('aqar.filters.maxPriceInput', 'Maximum price')}
                  value={filters.priceMax || ''}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    if (value === '') {
                      updateFilters({ priceMax: undefined });
                    } else {
                      const parsed = Number(value);
                      if (Number.isFinite(parsed) && parsed >= 0) {
                        updateFilters({ priceMax: parsed });
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Bedrooms */}
          <div>
            <h3 id="bedrooms-label" className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Bed className="w-4 h-4" aria-hidden="true" />
              {t('aqar.filters.bedrooms', 'Bedrooms')}
            </h3>
            <div role="group" aria-labelledby="bedrooms-label" className="flex gap-2">
              {[1, 2, 3, 4, 5].map((count) => (
                <button
                  key={count}
                  onClick={() => toggleBedrooms(count)}
                  role="checkbox"
                  aria-checked={filters.bedrooms?.includes(count)}
                  aria-label={`${count === 5 ? '5 or more' : count} ${t('aqar.filters.bedroomsLabel', 'bedrooms')}`}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-warning focus:ring-offset-2 ${
                    filters.bedrooms?.includes(count)
                      ? 'border-warning bg-warning/10 text-foreground'
                      : 'border-border hover:border-border text-foreground'
                  }`}
                >
                  {count === 5 ? '5+' : count}
                </button>
              ))}
            </div>
          </div>

          {/* Bathrooms */}
          <div>
            <h3 id="bathrooms-label" className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Bath className="w-4 h-4" aria-hidden="true" />
              {t('aqar.filters.bathrooms', 'Bathrooms')}
            </h3>
            <div role="group" aria-labelledby="bathrooms-label" className="flex gap-2">
              {[1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  onClick={() => toggleBathrooms(count)}
                  role="checkbox"
                  aria-checked={filters.bathrooms?.includes(count)}
                  aria-label={`${count === 4 ? '4 or more' : count} ${t('aqar.filters.bathroomsLabel', 'bathrooms')}`}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-warning focus:ring-offset-2 ${
                    filters.bathrooms?.includes(count)
                      ? 'border-warning bg-warning/10 text-foreground'
                      : 'border-border hover:border-border text-foreground'
                  }`}
                >
                  {count === 4 ? '4+' : count}
                </button>
              ))}
            </div>
          </div>

          {/* Area Range */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Grid3x3 className="w-4 h-4" />
              {t('aqar.filters.area', 'Area (sqm)')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t('aqar.filters.minimum', 'Minimum')}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="10"
                  placeholder={t('aqar.filters.min', 'Min')}
                  aria-label={t('aqar.filters.minAreaInput', 'Minimum area in square meters')}
                  value={filters.areaMin || ''}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    if (value === '') {
                      updateFilters({ areaMin: undefined });
                    } else {
                      const parsed = Number(value);
                      if (Number.isFinite(parsed) && parsed >= 0) {
                        updateFilters({ areaMin: parsed });
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t('aqar.filters.maximum', 'Maximum')}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="10"
                  placeholder={t('aqar.filters.max', 'Max')}
                  aria-label={t('aqar.filters.maxAreaInput', 'Maximum area in square meters')}
                  value={filters.areaMax || ''}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    if (value === '') {
                      updateFilters({ areaMax: undefined });
                    } else {
                      const parsed = Number(value);
                      if (Number.isFinite(parsed) && parsed >= 0) {
                        updateFilters({ areaMax: parsed });
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {t('aqar.filters.location', 'Location')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t('aqar.filters.city', 'City')}</label>
                <select
                  value={filters.city || ''}
                  onChange={(e) => updateFilters({ city: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent"
                >
                  <option value="">{t('aqar.filters.allCities', 'All Cities')}</option>
                  {saudiCities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">{t('aqar.filters.district', 'District')}</label>
                <input
                  type="text"
                  placeholder={t('aqar.filters.enterDistrict', 'Enter district')}
                  value={filters.district || ''}
                  onChange={(e) => updateFilters({ district: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">{t('aqar.filters.amenities', 'Amenities')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {amenitiesList.map((amenity) => (
                <label
                  key={amenity}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.amenities?.includes(amenity)}
                    onChange={() => toggleAmenity(amenity)}
                    className="w-4 h-4 text-warning border-border rounded focus:ring-warning"
                  />
                  <span className="text-sm text-foreground">{amenity}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">{t('aqar.filters.additionalOptions', 'Additional Options')}</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.furnished || false}
                  onChange={(e) => updateFilters({ furnished: e.target.checked || null })}
                  className="w-4 h-4 text-warning border-border rounded focus:ring-warning"
                />
                <span className="text-sm text-foreground">{t('aqar.filters.furnished', 'Furnished')}</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.featured || false}
                  onChange={(e) => updateFilters({ featured: e.target.checked })}
                  className="w-4 h-4 text-warning border-border rounded focus:ring-warning"
                />
                <span className="text-sm text-foreground">{t('aqar.filters.featuredOnly', 'Featured Properties Only')}</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.verified || false}
                  onChange={(e) => updateFilters({ verified: e.target.checked })}
                  className="w-4 h-4 text-warning border-border rounded focus:ring-warning"
                />
                <span className="text-sm text-foreground">{t('aqar.filters.verifiedOnly', 'Verified Properties Only')}</span>
              </label>
            </div>
          </div>

          {/* Sort By */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">{t('aqar.filters.sortBy', 'Sort By')}</h3>
            <select
              value={filters.sortBy || 'DATE_DESC'}
              onChange={(e) => updateFilters({ sortBy: e.target.value as PropertyFilters['sortBy'] })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent"
            >
              <option value="DATE_DESC">{t('aqar.filters.newestFirst', 'Newest First')}</option>
              <option value="PRICE_ASC">{t('aqar.filters.priceLowToHigh', 'Price: Low to High')}</option>
              <option value="PRICE_DESC">{t('aqar.filters.priceHighToLow', 'Price: High to Low')}</option>
              <option value="AREA_DESC">{t('aqar.filters.largestFirst', 'Largest First')}</option>
              <option value="POPULAR">{t('aqar.filters.mostPopular', 'Most Popular')}</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              onClick={clearFilters}
              className="flex-1 px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-semibold"
            >
              {t('aqar.filters.clearAll', 'Clear All')}
            </button>
            <button
              onClick={() => setShowAdvanced(false)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-warning to-warning-dark text-white rounded-lg hover:shadow-lg transition-shadow font-semibold"
            >
              {t('aqar.filters.applyFilters', 'Apply Filters')}
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {activeFilterCount() > 0 && !showAdvanced && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">{t('aqar.filters.activeFilters', 'Active Filters:')}</span>
            {filters.listingType && filters.listingType !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-warning text-white text-sm rounded-full">
                {filters.listingType}
                <button onClick={() => updateFilters({ listingType: 'ALL' })}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(filters.propertyTypes?.length || 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-warning text-white text-sm rounded-full">
                {filters.propertyTypes!.length} {t('aqar.filters.typesSelected', 'types')}
                <button onClick={() => updateFilters({ propertyTypes: [] })}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="ms-auto text-sm text-warning hover:text-warning font-medium"
            >
              {t('aqar.filters.clearAll', 'Clear All')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
