"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  MapPin,
} from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { FacetMultiSelect } from "@/components/tables/filters/FacetMultiSelect";
import { NumericRangeFilter } from "@/components/tables/filters/NumericRangeFilter";

export interface SearchFiltersProps {
  onFilterChange?: (filters: PropertyFilters) => void;
  initialFilters?: PropertyFilters;
}

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
  city?: string;
  district?: string;
  amenities?: string[];
  furnished?: boolean | null;
  featured?: boolean;
  verified?: boolean;
  sortBy?: "PRICE_ASC" | "PRICE_DESC" | "DATE_DESC" | "AREA_DESC" | "POPULAR";
}

export default function SearchFilters({
  onFilterChange,
  initialFilters,
}: SearchFiltersProps) {
  const { t } = useTranslation();

  const [filters, setFilters] = useState<PropertyFilters>(
    initialFilters || {
      listingType: "ALL",
      sortBy: "DATE_DESC",
    },
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Accessibility: Focus management
  const filtersButtonRef = useRef<HTMLButtonElement>(null);
  const advancedFiltersRef = useRef<HTMLDivElement>(null);

  // Accessibility: Keyboard navigation - Close advanced filters with Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showAdvanced) {
        setShowAdvanced(false);
        // Restore focus to the filters button
        filtersButtonRef.current?.focus();
      }
    };

    if (showAdvanced) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [showAdvanced]);

  const propertyTypes = [
    {
      value: "APARTMENT",
      label: t("aqar.propertyTypes.apartment", "Apartment"),
      icon: "🏢",
    },
    {
      value: "VILLA",
      label: t("aqar.propertyTypes.villa", "Villa"),
      icon: "🏡",
    },
    {
      value: "TOWNHOUSE",
      label: t("aqar.propertyTypes.townhouse", "Townhouse"),
      icon: "🏘️",
    },
    {
      value: "PENTHOUSE",
      label: t("aqar.propertyTypes.penthouse", "Penthouse"),
      icon: "🏙️",
    },
    {
      value: "STUDIO",
      label: t("aqar.propertyTypes.studio", "Studio"),
      icon: "🏠",
    },
    { value: "LAND", label: t("aqar.propertyTypes.land", "Land"), icon: "🗺️" },
    {
      value: "COMMERCIAL",
      label: t("aqar.propertyTypes.commercial", "Commercial"),
      icon: "🏪",
    },
    {
      value: "WAREHOUSE",
      label: t("aqar.propertyTypes.warehouse", "Warehouse"),
      icon: "🏭",
    },
    {
      value: "OFFICE",
      label: t("aqar.propertyTypes.office", "Office"),
      icon: "🏢",
    },
  ];

  const amenitiesList = [
    t("aqar.amenitiesList.swimmingPool", "Swimming Pool"),
    t("aqar.amenitiesList.gym", "Gym"),
    t("aqar.amenitiesList.parking", "Parking"),
    t("aqar.amenitiesList.security", "Security"),
    t("aqar.amenitiesList.garden", "Garden"),
    t("aqar.amenitiesList.balcony", "Balcony"),
    t("aqar.amenitiesList.elevator", "Elevator"),
    t("aqar.amenitiesList.centralAc", "Central AC"),
    t("aqar.amenitiesList.maidRoom", "Maid Room"),
    t("aqar.amenitiesList.storage", "Storage"),
    t("aqar.amenitiesList.kidsArea", "Kids Area"),
    t("aqar.amenitiesList.bbqArea", "BBQ Area"),
  ];

  const saudiCities = [
    t("aqar.cities.riyadh", "Riyadh"),
    t("aqar.cities.jeddah", "Jeddah"),
    t("aqar.cities.mecca", "Mecca"),
    t("aqar.cities.medina", "Medina"),
    t("aqar.cities.dammam", "Dammam"),
    t("aqar.cities.khobar", "Khobar"),
    t("aqar.cities.dhahran", "Dhahran"),
    t("aqar.cities.jubail", "Jubail"),
    t("aqar.cities.tabuk", "Tabuk"),
    t("aqar.cities.abha", "Abha"),
    t("aqar.cities.khamisMushait", "Khamis Mushait"),
    t("aqar.cities.najran", "Najran"),
    t("aqar.cities.jazan", "Jazan"),
  ];

  const propertyTypeOptions = propertyTypes.map((type) => ({
    value: type.value,
    label: type.label,
  }));

  const bedroomOptions = [1, 2, 3, 4, 5].map((count) => ({
    value: String(count),
    label: count === 5 ? "5+" : String(count),
  }));

  const bathroomOptions = [1, 2, 3, 4].map((count) => ({
    value: String(count),
    label: count === 4 ? "4+" : String(count),
  }));

  const amenityOptions = amenitiesList.map((amenity) => ({
    value: amenity,
    label: amenity,
  }));

  const updateFilters = (updates: Partial<PropertyFilters>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };

  const clearFilters = () => {
    const cleared = {
      listingType: "ALL" as const,
      sortBy: "DATE_DESC" as const,
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
    if (filters.listingType && filters.listingType !== "ALL") count++;
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
          placeholder={t(
            "aqar.filters.search",
            "Search by location, property name, or keyword...",
          )}
          value={filters.search || ""}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="w-full ps-10 pe-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        <button type="button"
          onClick={() => updateFilters({ listingType: "ALL" })}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            filters.listingType === "ALL"
              ? "bg-warning text-white"
              : "bg-muted text-foreground hover:bg-muted"
          }`}
        >
          {t("aqar.filters.all", "All")}
        </button>
        <button type="button"
          onClick={() => updateFilters({ listingType: "SALE" })}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            filters.listingType === "SALE"
              ? "bg-warning text-white"
              : "bg-muted text-foreground hover:bg-muted"
          }`}
        >
          {t("aqar.filters.forSale", "For Sale")}
        </button>
        <button type="button"
          onClick={() => updateFilters({ listingType: "RENT" })}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            filters.listingType === "RENT"
              ? "bg-warning text-white"
              : "bg-muted text-foreground hover:bg-muted"
          }`}
        >
          {t("aqar.filters.forRent", "For Rent")}
        </button>
        <button type="button"
          onClick={() => updateFilters({ listingType: "LEASE" })}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            filters.listingType === "LEASE"
              ? "bg-warning text-white"
              : "bg-muted text-foreground hover:bg-muted"
          }`}
        >
          {t("aqar.filters.forLease", "For Lease")}
        </button>
        <div className="flex-1" />
        <button type="button"
          ref={filtersButtonRef}
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
          aria-controls="advanced-filters"
          aria-label={t(
            "aqar.filters.toggleFilters",
            `${showAdvanced ? "Hide" : "Show"} advanced filters${activeFilterCount() > 0 ? ` (${activeFilterCount()} active)` : ""}`,
          )}
          className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted transition-colors whitespace-nowrap"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>{t("aqar.filters.filtersButton", "Filters")}</span>
          {activeFilterCount() > 0 && (
            <span
              className="bg-warning text-white text-xs px-2 py-0.5 rounded-full"
              aria-live="polite"
            >
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
          aria-label={t(
            "aqar.filters.advancedFiltersRegion",
            "Advanced filters",
          )}
          className="border-t border-border pt-4 space-y-6"
        >
          {/* Property Type */}
          <FacetMultiSelect
            label={t("aqar.filters.propertyType", "Property Type")}
            options={propertyTypeOptions}
            selected={filters.propertyTypes || []}
            onChange={(values) => updateFilters({ propertyTypes: values })}
          />

          {/* Price Range */}
          <NumericRangeFilter
            label={t("aqar.filters.priceRange", "Price Range (SAR)")}
            value={{ min: filters.priceMin, max: filters.priceMax }}
            onChange={(range) =>
              updateFilters({ priceMin: range.min, priceMax: range.max })
            }
            min={0}
            step={1000}
          />

          {/* Bedrooms */}
          <FacetMultiSelect
            label={t("aqar.filters.bedrooms", "Bedrooms")}
            options={bedroomOptions}
            selected={(filters.bedrooms || []).map(String)}
            onChange={(values) =>
              updateFilters({ bedrooms: values.map((value) => Number(value)) })
            }
          />

          {/* Bathrooms */}
          <FacetMultiSelect
            label={t("aqar.filters.bathrooms", "Bathrooms")}
            options={bathroomOptions}
            selected={(filters.bathrooms || []).map(String)}
            onChange={(values) =>
              updateFilters({ bathrooms: values.map((value) => Number(value)) })
            }
          />

          {/* Area Range */}
          <NumericRangeFilter
            label={t("aqar.filters.area", "Area (sqm)")}
            value={{ min: filters.areaMin, max: filters.areaMax }}
            onChange={(range) =>
              updateFilters({ areaMin: range.min, areaMax: range.max })
            }
            min={0}
            step={10}
          />

          {/* Location */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {t("aqar.filters.location", "Location")}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  {t("aqar.filters.city", "City")}
                </label>
                <select
                  value={filters.city || ""}
                  onChange={(e) =>
                    updateFilters({ city: e.target.value || undefined })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent"
                >
                  <option value="">
                    {t("aqar.filters.allCities", "All Cities")}
                  </option>
                  {saudiCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  {t("aqar.filters.district", "District")}
                </label>
                <input
                  type="text"
                  placeholder={t(
                    "aqar.filters.enterDistrict",
                    "Enter district",
                  )}
                  value={filters.district || ""}
                  onChange={(e) =>
                    updateFilters({ district: e.target.value || undefined })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Amenities */}
          <FacetMultiSelect
            label={t("aqar.filters.amenities", "Amenities")}
            options={amenityOptions}
            selected={filters.amenities || []}
            onChange={(values) => updateFilters({ amenities: values })}
          />

          {/* Additional Options */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">
              {t("aqar.filters.additionalOptions", "Additional Options")}
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.furnished || false}
                  onChange={(e) =>
                    updateFilters({ furnished: e.target.checked || null })
                  }
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
                  onChange={(e) =>
                    updateFilters({ featured: e.target.checked })
                  }
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
                  onChange={(e) =>
                    updateFilters({ verified: e.target.checked })
                  }
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
              onChange={(e) =>
                updateFilters({
                  sortBy: e.target.value as PropertyFilters["sortBy"],
                })
              }
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-warning focus:border-transparent"
            >
              <option value="DATE_DESC">
                {t("aqar.filters.newestFirst", "Newest First")}
              </option>
              <option value="PRICE_ASC">
                {t("aqar.filters.priceLowToHigh", "Price: Low to High")}
              </option>
              <option value="PRICE_DESC">
                {t("aqar.filters.priceHighToLow", "Price: High to Low")}
              </option>
              <option value="AREA_DESC">
                {t("aqar.filters.largestFirst", "Largest First")}
              </option>
              <option value="POPULAR">
                {t("aqar.filters.mostPopular", "Most Popular")}
              </option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button type="button"
              onClick={clearFilters}
              className="flex-1 px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-semibold"
            >
              {t("aqar.filters.clearAll", "Clear All")}
            </button>
            <button type="button"
              onClick={() => setShowAdvanced(false)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-warning to-warning-dark text-white rounded-lg hover:shadow-lg transition-shadow font-semibold"
            >
              {t("aqar.filters.applyFilters", "Apply Filters")}
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {activeFilterCount() > 0 && !showAdvanced && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {t("aqar.filters.activeFilters", "Active Filters:")}
            </span>
            {filters.listingType && filters.listingType !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-warning text-white text-sm rounded-full">
                {filters.listingType}
                <button type="button" onClick={() => updateFilters({ listingType: "ALL" })}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(filters.propertyTypes?.length || 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-warning text-white text-sm rounded-full">
                {filters.propertyTypes!.length}{" "}
                {t("aqar.filters.typesSelected", "types")}
                <button type="button" onClick={() => updateFilters({ propertyTypes: [] })}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button type="button"
              onClick={clearFilters}
              className="ms-auto text-sm text-warning hover:text-warning font-medium"
            >
              {t("aqar.filters.clearAll", "Clear All")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
