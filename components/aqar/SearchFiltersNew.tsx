"use client";

/**
 * SearchFiltersNew Component
 * 
 * Refactored Aqar property search filters using standard components:
 * ✅ FacetMultiSelect (property types, cities, amenities)
 * ✅ NumericRangeFilter (price, area)
 * ✅ useTableQueryState (URL sync)
 * ✅ serializeFilters (query params)
 * 
 * @module components/aqar/SearchFiltersNew
 */

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  MapPin,
  Home,
  Bed,
  Bath,
} from "@/components/ui/icons";
import { useTranslation } from "@/contexts/TranslationContext";
import { FacetMultiSelect, FacetOption } from "@/components/tables/filters/FacetMultiSelect";
import { NumericRangeFilter, NumericRange } from "@/components/tables/filters/NumericRangeFilter";
import { useTableQueryState, TableState } from "@/hooks/useTableQueryState";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface PropertyFilters {
  search?: string;
  propertyTypes?: string[];
  listingType?: "SALE" | "RENT" | "LEASE" | "ALL";
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number[];
  bathrooms?: number[];
  areaMin?: number;
  areaMax?: number;
  city?: string[];
  district?: string;
  amenities?: string[];
  furnished?: boolean | null;
  featured?: boolean;
  verified?: boolean;
  sortBy?: "PRICE_ASC" | "PRICE_DESC" | "DATE_DESC" | "AREA_DESC" | "POPULAR";
}

export interface SearchFiltersNewProps {
  onFilterChange?: (filters: PropertyFilters) => void;
  initialFilters?: Partial<PropertyFilters>;
  /** Enable URL sync via useTableQueryState */
  syncToUrl?: boolean;
  /** Storage key for useTableQueryState */
  storageKey?: string;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const PROPERTY_TYPES = [
  { value: "APARTMENT", icon: "🏢" },
  { value: "VILLA", icon: "🏡" },
  { value: "TOWNHOUSE", icon: "🏘️" },
  { value: "PENTHOUSE", icon: "🏙️" },
  { value: "STUDIO", icon: "🏠" },
  { value: "LAND", icon: "🗺️" },
  { value: "COMMERCIAL", icon: "🏪" },
  { value: "WAREHOUSE", icon: "🏭" },
  { value: "OFFICE", icon: "🏢" },
] as const;

const SAUDI_CITIES = [
  "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", 
  "Dhahran", "Jubail", "Tabuk", "Abha", "Khamis Mushait", "Najran", "Jazan"
] as const;

const AMENITIES_LIST = [
  "Swimming Pool", "Gym", "Parking", "Security", "Garden", "Balcony",
  "Elevator", "Central AC", "Maid Room", "Storage", "Kids Area", "BBQ Area"
] as const;

const BEDROOM_OPTIONS = [1, 2, 3, 4, 5] as const;
const BATHROOM_OPTIONS = [1, 2, 3, 4] as const;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function filtersToTableState(filters: PropertyFilters): TableState {
  return {
    q: filters.search,
    filters: {
      propertyTypes: filters.propertyTypes,
      listingType: filters.listingType,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      bedrooms: filters.bedrooms,
      bathrooms: filters.bathrooms,
      areaMin: filters.areaMin,
      areaMax: filters.areaMax,
      city: filters.city,
      district: filters.district,
      amenities: filters.amenities,
      furnished: filters.furnished,
      featured: filters.featured,
      verified: filters.verified,
    },
    sort: filters.sortBy ? [{ id: filters.sortBy, desc: false }] : undefined,
  };
}

function tableStateToFilters(state: TableState): PropertyFilters {
  const f = state.filters || {};
  return {
    search: state.q,
    propertyTypes: f.propertyTypes as string[] | undefined,
    listingType: f.listingType as PropertyFilters["listingType"],
    priceMin: f.priceMin as number | undefined,
    priceMax: f.priceMax as number | undefined,
    bedrooms: f.bedrooms as number[] | undefined,
    bathrooms: f.bathrooms as number[] | undefined,
    areaMin: f.areaMin as number | undefined,
    areaMax: f.areaMax as number | undefined,
    city: f.city as string[] | undefined,
    district: f.district as string | undefined,
    amenities: f.amenities as string[] | undefined,
    furnished: f.furnished as boolean | null | undefined,
    featured: f.featured as boolean | undefined,
    verified: f.verified as boolean | undefined,
    sortBy: state.sort?.[0]?.id as PropertyFilters["sortBy"],
  };
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

function SearchFiltersNewContent({
  onFilterChange,
  initialFilters,
  syncToUrl: _syncToUrl = true,
  storageKey = "aqar-search",
}: SearchFiltersNewProps) {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // URL sync via useTableQueryState
  const { state, updateState, resetState } = useTableQueryState(storageKey, 
    filtersToTableState(initialFilters || { listingType: "ALL", sortBy: "DATE_DESC" })
  );

  // Convert table state to filters
  const filters = useMemo(() => tableStateToFilters(state), [state]);

  // Notify parent of filter changes
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(filters);
    }
  }, [filters, onFilterChange]);

  // ─── Option Builders ───────────────────────────────────────

  const propertyTypeOptions: FacetOption[] = useMemo(() => 
    PROPERTY_TYPES.map(pt => ({
      value: pt.value,
      label: `${pt.icon} ${t(`aqar.propertyTypes.${pt.value.toLowerCase()}`, pt.value)}`,
    })),
    [t]
  );

  const cityOptions: FacetOption[] = useMemo(() => 
    SAUDI_CITIES.map(city => ({
      value: city,
      label: t(`aqar.cities.${city.toLowerCase().replace(/\s+/g, '')}`, city),
    })),
    [t]
  );

  const amenityOptions: FacetOption[] = useMemo(() => 
    AMENITIES_LIST.map(amenity => ({
      value: amenity,
      label: t(`aqar.amenitiesList.${amenity.toLowerCase().replace(/\s+/g, '')}`, amenity),
    })),
    [t]
  );

  const bedroomOptions: FacetOption[] = useMemo(() => 
    BEDROOM_OPTIONS.map(num => ({
      value: String(num),
      label: num === 5 ? "5+" : String(num),
    })),
    []
  );

  const bathroomOptions: FacetOption[] = useMemo(() => 
    BATHROOM_OPTIONS.map(num => ({
      value: String(num),
      label: num === 4 ? "4+" : String(num),
    })),
    []
  );

  // ─── Update Handlers ───────────────────────────────────────

  const updateFilters = useCallback((updates: Partial<PropertyFilters>) => {
    const newFilters = { ...filters, ...updates };
    updateState(filtersToTableState(newFilters));
  }, [filters, updateState]);

  const clearFilters = useCallback(() => {
    resetState();
  }, [resetState]);

  // ─── Active Filter Count ───────────────────────────────────

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.propertyTypes?.length) count++;
    if (filters.listingType && filters.listingType !== "ALL") count++;
    if (filters.priceMin != null || filters.priceMax != null) count++;
    if (filters.bedrooms?.length) count++;
    if (filters.bathrooms?.length) count++;
    if (filters.areaMin != null || filters.areaMax != null) count++;
    if (filters.city?.length) count++;
    if (filters.amenities?.length) count++;
    if (filters.furnished != null) count++;
    if (filters.featured) count++;
    if (filters.verified) count++;
    return count;
  }, [filters]);

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="bg-card rounded-2xl shadow-md p-4">
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder={t("aqar.filters.search", "Search by location, property name, or keyword...")}
          value={filters.search || ""}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="w-full ps-10 pe-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent"
        />
      </div>

      {/* Quick Listing Type Filters */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        {(["ALL", "SALE", "RENT", "LEASE"] as const).map((type) => (
          <button
            key={type}
            onClick={() => updateFilters({ listingType: type })}
            aria-label={t(`aqar.filters.${type === "ALL" ? "all" : `for${type.charAt(0) + type.slice(1).toLowerCase()}`}.ariaLabel`, 
              `Filter by ${type === "ALL" ? "all listing types" : `properties for ${type.toLowerCase()}`}`)}
            aria-pressed={filters.listingType === type}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              filters.listingType === type
                ? "bg-warning text-white"
                : "bg-muted text-foreground hover:bg-muted"
            }`}
          >
            {t(`aqar.filters.${type === "ALL" ? "all" : `for${type.charAt(0) + type.slice(1).toLowerCase()}`}`, 
              type === "ALL" ? "All" : `For ${type.charAt(0) + type.slice(1).toLowerCase()}`)}
          </button>
        ))}
        
        <div className="flex-1" />
        
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
          aria-controls="advanced-filters"
          className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted transition-colors whitespace-nowrap"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>{t("aqar.filters.filtersButton", "Filters")}</span>
          {activeFilterCount > 0 && (
            <span className="bg-warning text-white text-xs px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div
          id="advanced-filters"
          role="region"
          aria-label={t("aqar.filters.advancedFiltersRegion", "Advanced filters")}
          className="border-t border-border pt-4 space-y-6"
        >
          {/* Property Type - FacetMultiSelect */}
          <div>
            <div className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Home className="w-4 h-4" aria-hidden="true" />
              {t("aqar.filters.propertyType", "Property Type")}
            </div>
            <FacetMultiSelect
              label=""
              options={propertyTypeOptions}
              selected={filters.propertyTypes || []}
              onChange={(values) => updateFilters({ propertyTypes: values })}
              searchable={false}
            />
          </div>

          {/* Price Range - NumericRangeFilter */}
          <NumericRangeFilter
            label={t("aqar.filters.priceRange", "Price Range")}
            value={{ min: filters.priceMin, max: filters.priceMax }}
            onChange={(range: NumericRange) => updateFilters({ 
              priceMin: range.min, 
              priceMax: range.max 
            })}
            prefix="SAR"
            step={1000}
          />

          {/* Bedrooms - FacetMultiSelect */}
          <div>
            <div className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Bed className="w-4 h-4" aria-hidden="true" />
              {t("aqar.filters.bedrooms", "Bedrooms")}
            </div>
            <FacetMultiSelect
              label=""
              options={bedroomOptions}
              selected={(filters.bedrooms || []).map(String)}
              onChange={(values) => updateFilters({ bedrooms: values.map(Number) })}
              searchable={false}
            />
          </div>

          {/* Bathrooms - FacetMultiSelect */}
          <div>
            <div className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Bath className="w-4 h-4" aria-hidden="true" />
              {t("aqar.filters.bathrooms", "Bathrooms")}
            </div>
            <FacetMultiSelect
              label=""
              options={bathroomOptions}
              selected={(filters.bathrooms || []).map(String)}
              onChange={(values) => updateFilters({ bathrooms: values.map(Number) })}
              searchable={false}
            />
          </div>

          {/* Area Range - NumericRangeFilter */}
          <NumericRangeFilter
            label={t("aqar.filters.area", "Area")}
            value={{ min: filters.areaMin, max: filters.areaMax }}
            onChange={(range: NumericRange) => updateFilters({ 
              areaMin: range.min, 
              areaMax: range.max 
            })}
            suffix="sqm"
            step={10}
          />

          {/* City - FacetMultiSelect */}
          <div>
            <div className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" aria-hidden="true" />
              {t("aqar.filters.location", "Location")}
            </div>
            <FacetMultiSelect
              label=""
              options={cityOptions}
              selected={filters.city || []}
              onChange={(values) => updateFilters({ city: values })}
              searchable={true}
            />
          </div>

          {/* Amenities - FacetMultiSelect */}
          <div>
            <div className="font-semibold text-foreground mb-3">
              {t("aqar.filters.amenities", "Amenities")}
            </div>
            <FacetMultiSelect
              label=""
              options={amenityOptions}
              selected={filters.amenities || []}
              onChange={(values) => updateFilters({ amenities: values })}
              searchable={true}
            />
          </div>

          {/* Additional Options - Checkboxes */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">
              {t("aqar.filters.additionalOptions", "Additional Options")}
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.furnished || false}
                  onChange={(e) => updateFilters({ furnished: e.target.checked || null })}
                  className="w-4 h-4 text-warning border-border rounded focus:ring-warning"
                />
                <span className="text-sm text-foreground">
                  {t("aqar.filters.furnished", "Furnished")}
                </span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.featured || false}
                  onChange={(e) => updateFilters({ featured: e.target.checked })}
                  className="w-4 h-4 text-warning border-border rounded focus:ring-warning"
                />
                <span className="text-sm text-foreground">
                  {t("aqar.filters.featuredOnly", "Featured Properties Only")}
                </span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.verified || false}
                  onChange={(e) => updateFilters({ verified: e.target.checked })}
                  className="w-4 h-4 text-warning border-border rounded focus:ring-warning"
                />
                <span className="text-sm text-foreground">
                  {t("aqar.filters.verifiedOnly", "Verified Properties Only")}
                </span>
              </label>
            </div>
          </div>

          {/* Sort By */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">
              {t("aqar.filters.sortBy", "Sort By")}
            </h3>
            <select
              value={filters.sortBy || "DATE_DESC"}
              onChange={(e) => updateFilters({ sortBy: e.target.value as PropertyFilters["sortBy"] })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent"
            >
              <option value="DATE_DESC">{t("aqar.filters.newestFirst", "Newest First")}</option>
              <option value="PRICE_ASC">{t("aqar.filters.priceLowToHigh", "Price: Low to High")}</option>
              <option value="PRICE_DESC">{t("aqar.filters.priceHighToLow", "Price: High to Low")}</option>
              <option value="AREA_DESC">{t("aqar.filters.largestFirst", "Largest First")}</option>
              <option value="POPULAR">{t("aqar.filters.mostPopular", "Most Popular")}</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              onClick={clearFilters}
              className="flex-1 px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-semibold"
              aria-label={t("aqar.filters.clearAll.ariaLabel", "Clear all active filters")}
            >
              {t("aqar.filters.clearAll", "Clear All")}
            </button>
            <button
              onClick={() => setShowAdvanced(false)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-warning to-warning-dark text-white rounded-lg hover:shadow-lg transition-shadow font-semibold"
              aria-label={t("aqar.filters.applyFilters.ariaLabel", "Apply selected filters and close panel")}
            >
              {t("aqar.filters.applyFilters", "Apply Filters")}
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && !showAdvanced && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {t("aqar.filters.activeFilters", "Active Filters:")}
            </span>
            {filters.listingType && filters.listingType !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-warning text-white text-sm rounded-full">
                {filters.listingType}
                <button onClick={() => updateFilters({ listingType: "ALL" })} aria-label={`Remove ${filters.listingType} filter`}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(filters.propertyTypes?.length || 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-warning text-white text-sm rounded-full">
                {filters.propertyTypes!.length} {t("aqar.filters.typesSelected", "types")}
                <button onClick={() => updateFilters({ propertyTypes: [] })} aria-label="Remove property types filter">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(filters.city?.length || 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-warning text-white text-sm rounded-full">
                {filters.city!.length} {t("aqar.filters.citiesSelected", "cities")}
                <button onClick={() => updateFilters({ city: [] })} aria-label="Remove city filter">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="ms-auto text-sm text-warning hover:text-warning font-medium"
              aria-label="Clear all active property filters"
            >
              {t("aqar.filters.clearAll", "Clear All")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SearchFiltersNew wrapped in Suspense for useSearchParams() via useTableQueryState
 */
export default function SearchFiltersNew(props: SearchFiltersNewProps) {
  return (
    <Suspense fallback={
      <div className="animate-pulse bg-card border border-border rounded-2xl p-4">
        <div className="h-12 bg-muted rounded mb-4" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    }>
      <SearchFiltersNewContent {...props} />
    </Suspense>
  );
}
