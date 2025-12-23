"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

interface Facets {
  categories: Record<string, number>;
  subcategories: Record<string, number>;
  ratings: Record<string, number>;
  badges: Record<string, number>;
  priceRanges: Record<string, number>;
}

interface SearchFiltersProps {
  facets?: Facets;
}

export default function SearchFilters({ facets }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auto = useAutoTranslator("souq.searchFilters");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["categories", "price", "rating"]),
  );

  // Get current filter values
  const currentCategory = searchParams?.get("category");
  const currentMinPrice = searchParams?.get("minPrice");
  const currentMaxPrice = searchParams?.get("maxPrice");
  const currentMinRating = searchParams?.get("minRating");
  const currentBadges =
    searchParams?.get("badges")?.split(",").filter(Boolean) || [];

  // Toggle section expansion
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Apply filter
  const applyFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams?.toString() || "");

    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    // Reset to page 1 when filters change
    params.set("page", "1");

    router.push(`/souq/search?${params.toString()}`);
  };

  // Toggle badge filter
  const toggleBadge = (badge: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    const currentBadges =
      params.get("badges")?.split(",").filter(Boolean) || [];

    if (currentBadges.includes(badge)) {
      // Remove badge
      const newBadges = currentBadges.filter((b) => b !== badge);
      if (newBadges.length > 0) {
        params.set("badges", newBadges.join(","));
      } else {
        params.delete("badges");
      }
    } else {
      // Add badge
      params.set("badges", [...currentBadges, badge].join(","));
    }

    params.set("page", "1");
    router.push(`/souq/search?${params.toString()}`);
  };

  // Clear all filters
  const clearAllFilters = () => {
    const params = new URLSearchParams();
    const query = searchParams?.get("q");
    if (query) params.set("q", query);
    router.push(`/souq/search?${params.toString()}`);
  };

  // Check if any filters are active
  const hasActiveFilters =
    currentCategory ||
    currentMinPrice ||
    currentMaxPrice ||
    currentMinRating ||
    currentBadges.length > 0;

  return (
    <div className="space-y-6">
      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-primary-dark">
              {auto("Active Filters", "activeFiltersHeading")}
            </h3>
            <button type="button"
              onClick={clearAllFilters}
              className="text-xs text-primary hover:text-primary-dark font-medium"
            >
              {auto("Clear All", "clearAllButton")}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentCategory && (
              <FilterChip
                label={`${auto("Category", "chip.categoryLabel")}: ${currentCategory}`}
                removeLabel={auto("Remove filter", "chip.remove")}
                onRemove={() => applyFilter("category", null)}
              />
            )}
            {currentMinPrice && (
              <FilterChip
                label={`${auto("Min", "chip.min")}: ${currentMinPrice} SAR`}
                removeLabel={auto("Remove filter", "chip.remove")}
                onRemove={() => applyFilter("minPrice", null)}
              />
            )}
            {currentMaxPrice && (
              <FilterChip
                label={`${auto("Max", "chip.max")}: ${currentMaxPrice} SAR`}
                removeLabel={auto("Remove filter", "chip.remove")}
                onRemove={() => applyFilter("maxPrice", null)}
              />
            )}
            {currentMinRating && (
              <FilterChip
                label={`${currentMinRating}+ ${auto("Stars", "chip.stars")}`}
                removeLabel={auto("Remove filter", "chip.remove")}
                onRemove={() => applyFilter("minRating", null)}
              />
            )}
            {currentBadges.map((badge) => (
              <FilterChip
                key={badge}
                label={badge}
                removeLabel={auto("Remove filter", "chip.remove")}
                onRemove={() => toggleBadge(badge)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <FilterSection
        title={auto("Categories", "section.categories")}
        expanded={expandedSections.has("categories")}
        onToggle={() => toggleSection("categories")}
      >
        <div className="space-y-2">
          {facets?.categories &&
            Object.entries(facets.categories).map(([category, count]) => (
              <button type="button"
                key={category}
                onClick={() =>
                  applyFilter(
                    "category",
                    category === currentCategory ? null : category,
                  )
                }
                className={`w-full text-start px-3 py-2 rounded-lg hover:bg-muted flex items-center justify-between ${
                  currentCategory === category
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground"
                }`}
              >
                <span className="text-sm">{category}</span>
                <span className="text-xs text-gray-500">({count})</span>
              </button>
            ))}
        </div>
      </FilterSection>

      {/* Price Range */}
      <FilterSection
        title={auto("Price Range", "section.price")}
        expanded={expandedSections.has("price")}
        onToggle={() => toggleSection("price")}
      >
        <div className="space-y-2">
          {facets?.priceRanges &&
            Object.entries(facets.priceRanges).map(([range, count]) => {
              if (count === 0) return null;

              // Parse range (e.g., "50 - 100 SAR")
              const match = range.match(/(\d+)\s*-\s*(\d+)/);
              const min = match ? match[1] : null;
              const max = match ? match[2] : null;

              const isActive =
                currentMinPrice === min && currentMaxPrice === max;

              return (
                <button type="button"
                  key={range}
                  onClick={() => {
                    if (isActive) {
                      applyFilter("minPrice", null);
                      applyFilter("maxPrice", null);
                    } else if (min && max) {
                      if (!searchParams) return;
                      const params = new URLSearchParams(
                        searchParams.toString(),
                      );
                      params.set("minPrice", min);
                      params.set("maxPrice", max);
                      params.set("page", "1");
                      router.push(`/souq/search?${params.toString()}`);
                    }
                  }}
                  className={`w-full text-start px-3 py-2 rounded-lg hover:bg-muted flex items-center justify-between ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground"
                  }`}
                >
                  <span className="text-sm">{range}</span>
                  <span className="text-xs text-gray-500">({count})</span>
                </button>
              );
            })}
        </div>
      </FilterSection>

      {/* Rating */}
      <FilterSection
        title={auto("Customer Rating", "section.rating")}
        expanded={expandedSections.has("rating")}
        onToggle={() => toggleSection("rating")}
      >
        <div className="space-y-2">
          {[4, 3, 2, 1].map((rating) => (
            <button type="button"
              key={rating}
              onClick={() =>
                applyFilter(
                  "minRating",
                  currentMinRating === rating.toString()
                    ? null
                    : rating.toString(),
                )
              }
              className={`w-full text-start px-3 py-2 rounded-lg hover:bg-muted flex items-center gap-2 ${
                currentMinRating === rating.toString()
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground"
              }`}
            >
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={i < rating ? "text-yellow-400" : "text-gray-300"}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm">{auto("& Up", "rating.andUp")}</span>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Badges */}
      {facets?.badges && Object.keys(facets.badges).length > 0 && (
        <FilterSection
          title={auto("Features", "section.features")}
          expanded={expandedSections.has("badges")}
          onToggle={() => toggleSection("badges")}
        >
          <div className="space-y-2">
            {Object.entries(facets.badges).map(([badge, count]) => (
              <label
                key={badge}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={currentBadges.includes(badge)}
                    onChange={() => toggleBadge(badge)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 capitalize">
                    {badge.replace("-", " ")}
                  </span>
                </div>
                <span className="text-xs text-gray-500">({count})</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}
    </div>
  );
}

// Filter Section Component
function FilterSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <button type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
      >
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {expanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// Filter Chip Component
function FilterChip({
  label,
  onRemove,
  removeLabel,
}: {
  label: string;
  onRemove: () => void;
  removeLabel?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-primary/20 rounded-full text-sm text-primary-dark">
      {label}
      <button type="button"
        onClick={onRemove}
        className="hover:bg-primary/10 rounded-full p-0.5"
        aria-label={removeLabel}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
