"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import SearchBar from "@/components/souq/SearchBar";
import SearchFilters from "@/components/souq/SearchFilters";
import { Grid, List, ChevronLeft, ChevronRight } from "@/components/ui/icons";
import Link from "next/link";
import Image from "next/image";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { logger } from "@/lib/logger";

interface Product {
  fsin: string;
  title: string;
  brand: string;
  price: number;
  rating: number;
  totalReviews: number;
  imageUrl: string;
  inStock: boolean;
  badges: string[];
  sellerName: string;
}

interface SearchResponse {
  hits: Product[];
  totalHits: number;
  totalPages: number;
  page: number;
  facets: {
    categories: Record<string, number>;
    subcategories: Record<string, number>;
    ratings: Record<string, number>;
    badges: Record<string, number>;
    priceRanges: Record<string, number>;
  };
  processingTimeMs: number;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const params = searchParams ?? new URLSearchParams();
  const auto = useAutoTranslator("souq.search");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("relevance");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get query params
  const query = params.get("q") || "";
  const page = parseInt(params.get("page") || "1", 10);
  const category = params.get("category");
  const minPrice = params.get("minPrice");
  const maxPrice = params.get("maxPrice");
  const minRating = params.get("minRating");
  const badges = params.get("badges");

  // Fetch search results
  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (query) params.append("q", query);
        if (category) params.append("category", category);
        if (minPrice) params.append("minPrice", minPrice);
        if (maxPrice) params.append("maxPrice", maxPrice);
        if (minRating) params.append("minRating", minRating);
        if (badges) params.append("badges", badges);
        params.append("sort", sortBy);
        params.append("page", page.toString());
        params.append("limit", "20");

        const response = await fetch(`/api/souq/search?${params.toString()}`);

        if (!response.ok)
          throw new Error(auto("Search failed", "errors.searchFailed"));

        const data = await response.json();
        setResults(data.data);
      } catch (err) {
        logger.error("Search failed", err, {
          component: "SouqSearchPage",
          action: "fetchResults",
          query,
          category,
        });
        setError(
          auto(
            "Failed to load search results. Please try again.",
            "errors.loadFailed",
          ),
        );
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [
    query,
    page,
    category,
    minPrice,
    maxPrice,
    minRating,
    badges,
    sortBy,
    auto,
  ]);

  // Handle sort change
  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (!searchParams) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    window.location.href = `/souq/search?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <SearchBar initialQuery={query} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <SearchFilters facets={results?.facets} />
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Results Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  {loading ? (
                    <div className="h-6 w-48 bg-gray-200 animate-pulse rounded"></div>
                  ) : results ? (
                    <p className="text-sm text-gray-600">
                      {auto("{{count}} results", "results.count").replace(
                        "{{count}}",
                        results.totalHits.toLocaleString(),
                      )}
                      {query &&
                        auto(' for "{{query}}"', "results.forQuery").replace(
                          "{{query}}",
                          query,
                        )}
                      {results.processingTimeMs && (
                        <span className="text-gray-400">
                          {auto(
                            " ({{time}}ms)",
                            "results.processingTime",
                          ).replace(
                            "{{time}}",
                            String(results.processingTimeMs),
                          )}
                        </span>
                      )}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-4">
                  {/* Sort Dropdown */}
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="relevance">
                      {auto("Most Relevant", "sort.relevance")}
                    </option>
                    <option value="price_asc">
                      {auto("Price: Low to High", "sort.priceAsc")}
                    </option>
                    <option value="price_desc">
                      {auto("Price: High to Low", "sort.priceDesc")}
                    </option>
                    <option value="rating">
                      {auto("Highest Rated", "sort.rating")}
                    </option>
                    <option value="newest">
                      {auto("Newest First", "sort.newest")}
                    </option>
                  </select>

                  {/* View Toggle */}
                  <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                    <button type="button"
                      onClick={() => setViewMode("grid")}
                      className={`p-2 ${
                        viewMode === "grid"
                          ? "bg-primary/10 text-primary"
                          : "bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                      aria-label={auto("Grid view", "viewMode.grid")}
                      aria-pressed={viewMode === "grid"}
                      title={auto("Grid view", "viewMode.grid")}
                    >
                      <Grid className="h-5 w-5" />
                    </button>
                    <button type="button"
                      onClick={() => setViewMode("list")}
                      className={`p-2 ${
                        viewMode === "list"
                          ? "bg-primary/10 text-primary"
                          : "bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                      aria-label={auto("List view", "viewMode.list")}
                      aria-pressed={viewMode === "list"}
                      title={auto("List view", "viewMode.list")}
                    >
                      <List className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
                  >
                    <div className="aspect-square bg-gray-200 rounded-lg mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-destructive/5 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-destructive">{error}</p>
              </div>
            )}

            {/* No Results */}
            {!loading && !error && results && results.hits.length === 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {auto("No results found", "noResults.title")}
                </h3>
                <p className="text-gray-600 mb-6">
                  {auto(
                    "Try adjusting your search or filters to find what you're looking for",
                    "noResults.description",
                  )}
                </p>
                <div className="text-sm text-gray-500">
                  <p className="mb-2">
                    {auto("Suggestions:", "noResults.suggestions.title")}
                  </p>
                  <ul className="space-y-1">
                    <li>
                      •{" "}
                      {auto(
                        "Check your spelling",
                        "noResults.suggestions.spelling",
                      )}
                    </li>
                    <li>
                      •{" "}
                      {auto(
                        "Try more general keywords",
                        "noResults.suggestions.general",
                      )}
                    </li>
                    <li>
                      •{" "}
                      {auto(
                        "Remove some filters",
                        "noResults.suggestions.filters",
                      )}
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Results Grid */}
            {!loading && !error && results && results.hits.length > 0 && (
              <>
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                      : "space-y-4"
                  }
                >
                  {results.hits.map((product) => (
                    <ProductCard
                      key={product.fsin}
                      product={product}
                      viewMode={viewMode}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {results.totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <button type="button"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={auto("Previous page", "pagination.previous")}
                      title={auto("Previous page", "pagination.previous")}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div className="flex gap-2">
                      {[...Array(Math.min(5, results.totalPages))].map(
                        (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button type="button"
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-4 py-2 rounded-lg ${
                                page === pageNum
                                  ? "bg-primary text-white"
                                  : "border border-gray-300 hover:bg-gray-50"
                              }`}
                              aria-label={`${auto("Go to page", "pagination.goToPage")} ${pageNum}`}
                              aria-current={page === pageNum ? "page" : undefined}
                            >
                              {pageNum}
                            </button>
                          );
                        },
                      )}
                    </div>

                    <button type="button"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= results.totalPages}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={auto("Next page", "pagination.next")}
                      title={auto("Next page", "pagination.next")}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/**
 * SearchPage wrapped in Suspense for useSearchParams()
 */
export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse w-full max-w-6xl p-8 space-y-4">
          <div className="h-12 bg-muted rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-muted rounded" />)}
          </div>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}

// Product Card Component
function ProductCard({
  product,
  viewMode,
}: {
  product: Product;
  viewMode: "grid" | "list";
}) {
  const auto = useAutoTranslator("souq.search");
  const currency = auto("SAR", "currency");

  if (viewMode === "list") {
    return (
      <Link
        href={`/souq/products/${product.fsin}`}
        className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow"
      >
        <div className="flex gap-4">
          <div className="w-32 h-32 flex-shrink-0">
            <Image
              src={product.imageUrl || "/placeholder-product.png"}
              alt={product.title}
              width={128}
              height={128}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              {product.title}
            </h3>
            <p className="text-sm text-gray-600 mb-2">{product.brand}</p>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center">
                <span className="text-warning">★</span>
                <span className="text-sm font-medium ms-1">
                  {product.rating.toFixed(1)}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                ({product.totalReviews})
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              {product.badges.map((badge) => (
                <span
                  key={badge}
                  className="inline-block px-2 py-1 text-xs font-medium bg-primary/5 text-primary rounded"
                >
                  {badge}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-gray-900">
                {product.price.toFixed(2)}{" "}
                <span className="text-sm">{currency}</span>
              </p>
              {!product.inStock && (
                <span className="text-sm text-destructive font-medium">
                  {auto("Out of Stock", "product.outOfStock")}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/souq/products/${product.fsin}`}
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow"
    >
      <div className="aspect-square mb-4 relative">
        <Image
          src={product.imageUrl || "/placeholder-product.png"}
          alt={product.title}
          fill
          className="object-cover rounded-lg"
        />
      </div>
      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 h-12">
        {product.title}
      </h3>
      <p className="text-sm text-gray-600 mb-2">{product.brand}</p>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center">
          <span className="text-warning">★</span>
          <span className="text-sm font-medium ms-1">
            {product.rating.toFixed(1)}
          </span>
        </div>
        <span className="text-sm text-gray-500">({product.totalReviews})</span>
      </div>
      <p className="text-xl font-bold text-gray-900 mb-2">
        {product.price.toFixed(2)} <span className="text-sm">{currency}</span>
      </p>
      {!product.inStock && (
        <span className="text-sm text-destructive font-medium">
          {auto("Out of Stock", "product.outOfStock")}
        </span>
      )}
    </Link>
  );
}
