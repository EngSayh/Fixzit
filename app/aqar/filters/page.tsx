"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search as SearchIcon,
  MapPin,
  Home,
  DollarSign,
  Bed,
  Bath,
  Calendar,
  Filter,
} from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";

type FilterState = {
  propertyType: string;
  city: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  bathrooms: string;
  minArea: string;
  maxArea: string;
  furnished: string;
  availableFrom: string; // yyyy-mm-dd
  keywords: string;
};

const STORAGE_KEY = "aqar:filters";

const PROPERTY_TYPES = [
  { value: "", labelKey: "aqar.filters.any", fallback: "Any" },
  {
    value: "apartment",
    labelKey: "aqar.propertyType.apartment",
    fallback: "Apartment",
  },
  { value: "villa", labelKey: "aqar.propertyType.villa", fallback: "Villa" },
  {
    value: "townhouse",
    labelKey: "aqar.propertyType.townhouse",
    fallback: "Townhouse",
  },
  {
    value: "penthouse",
    labelKey: "aqar.propertyType.penthouse",
    fallback: "Penthouse",
  },
  { value: "studio", labelKey: "aqar.propertyType.studio", fallback: "Studio" },
  { value: "office", labelKey: "aqar.propertyType.office", fallback: "Office" },
  {
    value: "warehouse",
    labelKey: "aqar.propertyType.warehouse",
    fallback: "Warehouse",
  },
  { value: "land", labelKey: "aqar.propertyType.land", fallback: "Land" },
] as const;

const CITIES = [
  { value: "", labelKey: "aqar.filters.any", fallback: "Any" },
  { value: "riyadh", labelKey: "aqar.city.riyadh", fallback: "Riyadh" },
  { value: "jeddah", labelKey: "aqar.city.jeddah", fallback: "Jeddah" },
  { value: "dammam", labelKey: "aqar.city.dammam", fallback: "Dammam" },
  { value: "mecca", labelKey: "aqar.city.mecca", fallback: "Mecca" },
  { value: "medina", labelKey: "aqar.city.medina", fallback: "Medina" },
  { value: "khobar", labelKey: "aqar.city.khobar", fallback: "Khobar" },
  { value: "taif", labelKey: "aqar.city.taif", fallback: "Taif" },
] as const;

const DEFAULT_FILTERS: FilterState = {
  propertyType: "",
  city: "",
  minPrice: "",
  maxPrice: "",
  bedrooms: "",
  bathrooms: "",
  minArea: "",
  maxArea: "",
  furnished: "",
  availableFrom: "",
  keywords: "",
};

export default function FiltersPage() {
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // For RTL, keep numerics/date visually LTR to avoid Arabic-Indic direction issues
  const dirNum: React.HTMLAttributes<HTMLInputElement>["dir"] = isRTL
    ? "ltr"
    : undefined;

  // today in local tz for min on date input and validation
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // ---------- init from URL or sessionStorage ----------
  useEffect(() => {
    if (!params) return;
    const fromURL: Partial<FilterState> = {};
    params.forEach((v, k) => {
      if ((k as keyof FilterState) in DEFAULT_FILTERS) {
        (fromURL as Record<string, string>)[k] = String(v);
      }
    });

    if (Object.keys(fromURL).length > 0) {
      setFilters((prev) => ({ ...prev, ...(fromURL as FilterState) }));
      return;
    }

    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw)
        setFilters((prev) => ({
          ...prev,
          ...(JSON.parse(raw) as FilterState),
        }));
    } catch {
      /* ignore */
    }
  }, [params]);

  // Persist to sessionStorage (non-blocking)
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      /* ignore */
    }
  }, [filters]);

  // ---------- helpers ----------
  const handleFilterChange = useCallback(
    (key: keyof FilterState, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const sanitizeInt = useCallback((val: string) => {
    if (val === "" || val === undefined || val === null) return "";
    const n = Math.max(0, Math.floor(Number(val)));
    return Number.isFinite(n) ? String(n) : "";
  }, []);

  const clampFutureDate = useCallback(
    (yyyyMMdd: string) => {
      if (!yyyyMMdd) return "";
      // if stored date is in the past, drop it
      return yyyyMMdd < today ? "" : yyyyMMdd;
    },
    [today],
  );

  const buildParams = useCallback(
    (state: FilterState) => {
      // normalize ranges (swap if min > max)
      let minPrice = sanitizeInt(state.minPrice);
      let maxPrice = sanitizeInt(state.maxPrice);
      if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
        [minPrice, maxPrice] = [maxPrice, minPrice];
      }

      let minArea = sanitizeInt(state.minArea);
      let maxArea = sanitizeInt(state.maxArea);
      if (minArea && maxArea && Number(minArea) > Number(maxArea)) {
        [minArea, maxArea] = [maxArea, minArea];
      }

      const bedrooms = sanitizeInt(state.bedrooms);
      const bathrooms = sanitizeInt(state.bathrooms);

      const trimmedKeywords = state.keywords.trim();
      const availableFrom = clampFutureDate(state.availableFrom);

      const q = new URLSearchParams();
      const set = (k: keyof FilterState, v: string) => {
        if (v !== "") q.set(k, v);
      };

      set("propertyType", state.propertyType);
      set("city", state.city);
      set("minPrice", minPrice);
      set("maxPrice", maxPrice);
      set("bedrooms", bedrooms);
      set("bathrooms", bathrooms);
      set("minArea", minArea);
      set("maxArea", maxArea);
      set("furnished", state.furnished);
      set("availableFrom", availableFrom);
      if (trimmedKeywords) q.set("keywords", trimmedKeywords);

      return q;
    },
    [sanitizeInt, clampFutureDate],
  );

  const pushSearch = useCallback(
    (next: FilterState) => {
      const q = buildParams(next);
      router.push(`/aqar/filters?${q.toString()}`);
    },
    [router, buildParams],
  );

  const handleSearch = useCallback(() => {
    pushSearch(filters);
  }, [filters, pushSearch]);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    router.push("/aqar/filters");
  }, [router]);

  // ---------- JSX ----------
  return (
    <div className="min-h-screen bg-muted" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1
            className="text-3xl font-bold text-foreground mb-2"
            data-testid="filters-title"
          >
            {t("aqar.filters.title", "Search & Filters")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "aqar.filters.subtitle",
              "Find your perfect property with advanced search filters",
            )}
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-sm p-6 mb-6">
          {/* Form semantics allow Enter to submit */}
          <form
            data-testid="filters-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
          >
            {/* Keywords */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                <span className="inline-flex items-center gap-2">
                  <SearchIcon className="w-4 h-4" />
                  {t("aqar.filters.keywords", "Keywords")}
                </span>
              </label>
              <input
                data-testid="keywords-input"
                type="text"
                value={filters.keywords}
                onChange={(e) => handleFilterChange("keywords", e.target.value)}
                placeholder={t(
                  "aqar.filters.keywordsPlaceholder",
                  "Search by location, neighborhood, or description...",
                )}
                className="w-full px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                aria-label={t("aqar.filters.keywords", "Keywords")}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Property Type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <span className="inline-flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    {t("aqar.filters.propertyType", "Property Type")}
                  </span>
                </label>
                <select
                  data-testid="property-type-select"
                  value={filters.propertyType}
                  onChange={(e) =>
                    handleFilterChange("propertyType", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {PROPERTY_TYPES.map(({ value, labelKey, fallback }) => (
                    <option key={value || "any"} value={value}>
                      {t(labelKey, fallback)}
                    </option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {t("aqar.filters.city", "City")}
                  </span>
                </label>
                <select
                  data-testid="city-select"
                  value={filters.city}
                  onChange={(e) => handleFilterChange("city", e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {CITIES.map(({ value, labelKey, fallback }) => (
                    <option key={value || "any"} value={value}>
                      {t(labelKey, fallback)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bedrooms */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <span className="inline-flex items-center gap-2">
                    <Bed className="w-4 h-4" />
                    {t("aqar.filters.bedrooms", "Bedrooms")}
                  </span>
                </label>
                <select
                  data-testid="bedrooms-select"
                  value={filters.bedrooms}
                  onChange={(e) =>
                    handleFilterChange("bedrooms", sanitizeInt(e.target.value))
                  }
                  className="w-full px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">{t("aqar.filters.any", "Any")}</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="5">5+</option>
                </select>
              </div>

              {/* Bathrooms */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <span className="inline-flex items-center gap-2">
                    <Bath className="w-4 h-4" />
                    {t("aqar.filters.bathrooms", "Bathrooms")}
                  </span>
                </label>
                <select
                  data-testid="bathrooms-select"
                  value={filters.bathrooms}
                  onChange={(e) =>
                    handleFilterChange("bathrooms", sanitizeInt(e.target.value))
                  }
                  className="w-full px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">{t("aqar.filters.any", "Any")}</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                </select>
              </div>

              {/* Min Price */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <span className="inline-flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    {t("aqar.filters.minPrice", "Min Price (SAR)")}
                  </span>
                </label>
                <input
                  data-testid="min-price-input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={100}
                  dir={dirNum}
                  value={filters.minPrice}
                  onChange={(e) =>
                    handleFilterChange("minPrice", sanitizeInt(e.target.value))
                  }
                  placeholder="0"
                  className="w-full px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Max Price */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <span className="inline-flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    {t("aqar.filters.maxPrice", "Max Price (SAR)")}
                  </span>
                </label>
                <input
                  data-testid="max-price-input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={100}
                  dir={dirNum}
                  value={filters.maxPrice}
                  onChange={(e) =>
                    handleFilterChange("maxPrice", sanitizeInt(e.target.value))
                  }
                  placeholder="∞"
                  className="w-full px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Min Area */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("aqar.filters.minArea", "Min Area (m²)")}
                </label>
                <input
                  data-testid="min-area-input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={5}
                  dir={dirNum}
                  value={filters.minArea}
                  onChange={(e) =>
                    handleFilterChange("minArea", sanitizeInt(e.target.value))
                  }
                  placeholder="0"
                  className="w-full px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Max Area */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("aqar.filters.maxArea", "Max Area (m²)")}
                </label>
                <input
                  data-testid="max-area-input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={5}
                  dir={dirNum}
                  value={filters.maxArea}
                  onChange={(e) =>
                    handleFilterChange("maxArea", sanitizeInt(e.target.value))
                  }
                  placeholder="∞"
                  className="w-full px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Furnished */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t("aqar.filters.furnished", "Furnished")}
                </label>
                <select
                  data-testid="furnished-select"
                  value={filters.furnished}
                  onChange={(e) =>
                    handleFilterChange("furnished", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">{t("aqar.filters.any", "Any")}</option>
                  <option value="yes">
                    {t("aqar.filters.furnished.yes", "Furnished")}
                  </option>
                  <option value="no">
                    {t("aqar.filters.furnished.no", "Unfurnished")}
                  </option>
                  <option value="partial">
                    {t("aqar.filters.furnished.partial", "Partially Furnished")}
                  </option>
                </select>
              </div>

              {/* Available From */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {t("aqar.filters.availableFrom", "Available From")}
                  </span>
                </label>
                <input
                  data-testid="available-from-input"
                  type="date"
                  dir={dirNum}
                  value={filters.availableFrom}
                  min={today}
                  onChange={(e) =>
                    handleFilterChange("availableFrom", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-8 justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2 border border-border text-foreground rounded-2xl hover:bg-muted transition-colors"
                data-testid="reset-btn"
                aria-label={t("aqar.filters.reset", "Reset Filters")}
              >
                {t("aqar.filters.reset", "Reset Filters")}
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                data-testid="search-btn"
                aria-label={t("aqar.filters.search", "Search Properties")}
              >
                <Filter className="w-4 h-4" />
                {t("aqar.filters.search", "Search Properties")}
              </button>
            </div>
          </form>
        </div>

        {/* Quick Filter Presets */}
        <div
          className="bg-card rounded-2xl shadow-sm p-6"
          data-testid="quick-filters"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {t("aqar.filters.quickFilters", "Quick Filters")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              data-testid="preset-family-apartment"
              onClick={() => {
                const next: FilterState = {
                  ...filters,
                  propertyType: "apartment",
                  city: "riyadh",
                  bedrooms: "2",
                };
                setFilters(next);
                pushSearch(next);
              }}
              className="px-4 py-3 border border-border rounded-2xl hover:bg-muted transition-colors text-sm"
              aria-label={t("aqar.filters.preset.familyApartment", "2BR Apartment in Riyadh")}
            >
              {t(
                "aqar.filters.preset.familyApartment",
                "2BR Apartment in Riyadh",
              )}
            </button>
            <button
              data-testid="preset-luxury-villa"
              onClick={() => {
                const next: FilterState = {
                  ...filters,
                  propertyType: "villa",
                  bedrooms: "4",
                  city: "jeddah",
                };
                setFilters(next);
                pushSearch(next);
              }}
              className="px-4 py-3 border border-border rounded-2xl hover:bg-muted transition-colors text-sm"
              aria-label={t("aqar.filters.preset.luxuryVilla", "Luxury Villa in Jeddah")}
            >
              {t("aqar.filters.preset.luxuryVilla", "Luxury Villa in Jeddah")}
            </button>
            <button
              data-testid="preset-affordable-studio"
              onClick={() => {
                const next: FilterState = {
                  ...filters,
                  propertyType: "studio",
                  maxPrice: "50000",
                };
                setFilters(next);
                pushSearch(next);
              }}
              className="px-4 py-3 border border-border rounded-2xl hover:bg-muted transition-colors text-sm"
              aria-label={t("aqar.filters.preset.affordableStudio", "Affordable Studio")}
            >
              {t("aqar.filters.preset.affordableStudio", "Affordable Studio")}
            </button>
            <button
              data-testid="preset-commercial-office"
              onClick={() => {
                const next: FilterState = {
                  ...filters,
                  propertyType: "office",
                  city: "riyadh",
                };
                setFilters(next);
                pushSearch(next);
              }}
              className="px-4 py-3 border border-border rounded-2xl hover:bg-muted transition-colors text-sm"
              aria-label={t("aqar.filters.preset.commercialOffice", "Commercial Office")}
            >
              {t("aqar.filters.preset.commercialOffice", "Commercial Office")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
