"use client";

/**
 * Aqar Property Search Page (Refactored)
 * 
 * Uses the new SearchFiltersNew component with:
 * ✅ FacetMultiSelect
 * ✅ NumericRangeFilter
 * ✅ useTableQueryState (URL sync)
 * 
 * @module app/(app)/aqar/search/page
 */

import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import SearchFiltersNew, { PropertyFilters } from "@/components/aqar/SearchFiltersNew";
import { MapPin, Bed, Bath, Square, Building2 } from "@/components/ui/icons";
import Image from "next/image";

type ApiProperty = {
  id: string;
  code: string;
  name: string;
  type?: string;
  subtype?: string;
  address?: { city?: string; district?: string };
  details?: { totalArea?: number; bedrooms?: number; bathrooms?: number };
  market?: { listingPrice?: number };
  photos?: string[];
  rnplEligible?: boolean;
  auction?: { isAuction?: boolean; endAt?: string };
};

export default function AqarSearchPage() {
  const { t, isRTL } = useTranslation();
  const [properties, setProperties] = useState<ApiProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PropertyFilters>({});

  // Build API query from filters
  const buildQueryString = useCallback((f: PropertyFilters) => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("pageSize", "24");
    
    if (f.search) params.set("q", f.search);
    if (f.propertyTypes?.length) params.set("type", f.propertyTypes.join(","));
    if (f.listingType && f.listingType !== "ALL") params.set("listingType", f.listingType);
    if (f.priceMin != null) params.set("minPrice", String(f.priceMin));
    if (f.priceMax != null) params.set("maxPrice", String(f.priceMax));
    if (f.bedrooms?.length) params.set("bedrooms", f.bedrooms.join(","));
    if (f.bathrooms?.length) params.set("bathrooms", f.bathrooms.join(","));
    if (f.areaMin != null) params.set("minArea", String(f.areaMin));
    if (f.areaMax != null) params.set("maxArea", String(f.areaMax));
    if (f.city?.length) params.set("city", f.city.join(","));
    if (f.amenities?.length) params.set("amenities", f.amenities.join(","));
    if (f.furnished != null) params.set("furnished", String(f.furnished));
    if (f.featured) params.set("featured", "true");
    if (f.verified) params.set("verified", "true");
    if (f.sortBy) params.set("sort", f.sortBy);
    
    return params.toString();
  }, []);

  // Fetch properties when filters change
  useEffect(() => {
    let cancelled = false;
    
    const fetchProperties = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const query = buildQueryString(filters);
        const res = await fetch(`/api/aqar/properties?${query}`);
        
        if (!res.ok) throw new Error("Failed to fetch");
        
        const data = await res.json();
        if (!cancelled) {
          setProperties(Array.isArray(data.items) ? data.items : []);
        }
      } catch {
        if (!cancelled) {
          setError(t("aqar.properties.error", "Could not load properties"));
          setProperties([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProperties();
    
    return () => { cancelled = true; };
  }, [filters, buildQueryString, t]);

  // Handle filter changes from SearchFiltersNew
  const handleFilterChange = useCallback((newFilters: PropertyFilters) => {
    setFilters(newFilters);
  }, []);

  // Format price for display
  const formatPrice = (price?: number) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("en-SA", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-muted" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t("aqar.search.title", "Property Search")}
          </h1>
          <p className="text-muted-foreground">
            {t("aqar.search.subtitle", "Find your perfect property with advanced filters")}
          </p>
        </div>

        {/* Filters (Standard Components) */}
        <div className="mb-8">
          <SearchFiltersNew
            onFilterChange={handleFilterChange}
            syncToUrl={true}
            storageKey="aqar-search"
          />
        </div>

        {/* Results Section */}
        <div>
          {/* Results Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              {loading 
                ? t("aqar.search.loading", "Loading...") 
                : t("aqar.search.results", `${properties.length} Properties Found`)}
            </h2>
          </div>

          {/* Error State */}
          {error && (
            <div className="text-center py-12 text-destructive">
              <p>{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-card rounded-2xl shadow-sm animate-pulse">
                  <div className="h-48 bg-muted rounded-t-2xl" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results Grid */}
          {!loading && !error && properties.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <article
                  key={property.id}
                  className="bg-card rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Property Image */}
                  <div className="relative h-48 bg-muted">
                    {property.photos?.[0] ? (
                      <Image
                        src={property.photos[0]}
                        alt={property.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Building2 className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    {property.rnplEligible && (
                      <span className="absolute top-2 end-2 bg-success text-white text-xs px-2 py-1 rounded-full">
                        RNPL
                      </span>
                    )}
                  </div>

                  {/* Property Details */}
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground line-clamp-1 mb-1">
                      {property.name}
                    </h3>
                    
                    <div className="flex items-center text-sm text-muted-foreground mb-2">
                      <MapPin className="w-4 h-4 me-1" />
                      <span>
                        {property.address?.city || t("aqar.unknown", "Unknown")}
                        {property.address?.district && `, ${property.address.district}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      {property.details?.bedrooms != null && (
                        <span className="flex items-center gap-1">
                          <Bed className="w-4 h-4" />
                          {property.details.bedrooms}
                        </span>
                      )}
                      {property.details?.bathrooms != null && (
                        <span className="flex items-center gap-1">
                          <Bath className="w-4 h-4" />
                          {property.details.bathrooms}
                        </span>
                      )}
                      {property.details?.totalArea != null && (
                        <span className="flex items-center gap-1">
                          <Square className="w-4 h-4" />
                          {property.details.totalArea} sqm
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">
                        {formatPrice(property.market?.listingPrice)}
                      </span>
                      <span className="text-xs text-muted-foreground uppercase">
                        {property.type || "Property"}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && properties.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t("aqar.search.noResults", "No Properties Found")}
              </h3>
              <p className="text-muted-foreground">
                {t("aqar.search.noResultsDesc", "Try adjusting your filters to see more results")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
