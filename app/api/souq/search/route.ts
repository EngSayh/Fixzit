import { NextRequest, NextResponse } from "next/server";
import { searchClient, INDEXES } from "@/lib/meilisearch";
import { withMeiliResilience } from "@/lib/meilisearch-resilience";
import { z } from "zod";
import { logger } from "@/lib/logger";

const searchQuerySchema = z.object({
  q: z.string().optional().default(""),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  brandId: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  badges: z.string().optional(), // Comma-separated
  inStock: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional().default(true),
  orgId: z.string().optional(),
  sort: z
    .enum(["relevance", "price_asc", "price_desc", "rating", "newest"])
    .optional()
    .default("relevance"),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

/**
 * GET /api/souq/search
 *
 * Search products using Meilisearch with faceted filters
 *
 * Query Parameters:
 * - q: Search query (string)
 * - category: Filter by category (string)
 * - subcategory: Filter by subcategory (string)
 * - brandId: Filter by brand ID
 * - minPrice: Minimum price filter
 * - maxPrice: Maximum price filter
 * - minRating: Minimum rating (0-5)
 * - badges: Comma-separated badges (e.g., "fbf,top-seller")
 * - inStock: Filter in-stock only (boolean)
 * - isActive: Filter by active status (default: true)
 * - orgId: Filter by organization ID
 * - sort: Sort order (relevance|price_asc|price_desc|rating|newest)
 * - page: Page number (default: 1)
 * - limit: Items per page (1-100, default: 20)
 *
 * @returns Search results with facets and pagination metadata
 */
export async function GET(req: NextRequest) {
  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const params = {
      q: searchParams.get("q") || undefined,
      category: searchParams.get("category") || undefined,
      subcategory: searchParams.get("subcategory") || undefined,
      brandId: searchParams.get("brandId") || undefined,
      minPrice: searchParams.get("minPrice") || undefined,
      maxPrice: searchParams.get("maxPrice") || undefined,
      minRating: searchParams.get("minRating") || undefined,
      badges: searchParams.get("badges") || undefined,
      inStock: searchParams.get("inStock") || undefined,
      isActive: searchParams.get("isActive") || undefined,
      orgId: searchParams.get("orgId") || undefined,
      sort: searchParams.get("sort") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    };

    const validated = searchQuerySchema.parse(params);

    // Build filter array
    const filters: string[] = [];

    if (validated.isActive) {
      filters.push("inStock = true");
    }

    if (validated.category) {
      filters.push(`category = "${validated.category}"`);
    }

    if (validated.subcategory) {
      filters.push(`subcategory = "${validated.subcategory}"`);
    }

    if (validated.brandId) {
      filters.push(`brand = "${validated.brandId}"`);
    }

    if (validated.minPrice !== undefined || validated.maxPrice !== undefined) {
      if (
        validated.minPrice !== undefined &&
        validated.maxPrice !== undefined
      ) {
        filters.push(`price ${validated.minPrice} TO ${validated.maxPrice}`);
      } else if (validated.minPrice !== undefined) {
        filters.push(`price >= ${validated.minPrice}`);
      } else if (validated.maxPrice !== undefined) {
        filters.push(`price <= ${validated.maxPrice}`);
      }
    }

    if (validated.minRating !== undefined) {
      filters.push(`rating >= ${validated.minRating}`);
    }

    if (validated.badges) {
      const badgeList = validated.badges.split(",").filter(Boolean);
      if (badgeList.length > 0) {
        const badgeFilters = badgeList.map(
          (badge) => `badges = "${badge.trim()}"`,
        );
        filters.push(`(${badgeFilters.join(" OR ")})`);
      }
    }

    if (validated.inStock) {
      filters.push("inStock = true");
    }

    if (validated.orgId) {
      filters.push(`sellerId = "${validated.orgId}"`);
    }

    // Determine sort order
    let sortArray: string[] = [];
    switch (validated.sort) {
      case "price_asc":
        sortArray = ["price:asc"];
        break;
      case "price_desc":
        sortArray = ["price:desc"];
        break;
      case "rating":
        sortArray = ["rating:desc", "totalReviews:desc"];
        break;
      case "newest":
        sortArray = ["createdAt:desc"];
        break;
      default:
        // Relevance (Meilisearch default)
        sortArray = [];
    }

    // Calculate offset
    const offset = (validated.page - 1) * validated.limit;

    // Perform search
    const index = searchClient.index(INDEXES.PRODUCTS);

    const results = await withMeiliResilience("products-search", "search", () =>
      index.search(validated.q, {
        filter: filters.length > 0 ? filters : undefined,
        sort: sortArray.length > 0 ? sortArray : undefined,
        limit: validated.limit,
        offset,
        attributesToHighlight: ["title", "brand", "description"],
        highlightPreTag: "<mark>",
        highlightPostTag: "</mark>",
        facets: ["category", "subcategory", "rating", "badges"],
      }),
    );

    // Calculate price range facets
    const priceRanges = calculatePriceRanges(
      results.hits.map((hit) => {
        const value = (hit as { price?: number }).price;
        return typeof value === "number" ? value : 0;
      }),
    );

    const totalHits = results.estimatedTotalHits || results.hits.length;
    const totalPages = Math.ceil(totalHits / validated.limit);

    return NextResponse.json({
      success: true,
      data: {
        hits: results.hits,
        query: validated.q,
        page: validated.page,
        limit: validated.limit,
        totalHits,
        totalPages,
        facets: {
          categories: results.facetDistribution?.category || {},
          subcategories: results.facetDistribution?.subcategory || {},
          ratings: results.facetDistribution?.rating || {},
          badges: results.facetDistribution?.badges || {},
          priceRanges,
        },
        processingTimeMs: results.processingTimeMs,
        filters: {
          category: validated.category,
          subcategory: validated.subcategory,
          brandId: validated.brandId,
          minPrice: validated.minPrice,
          maxPrice: validated.maxPrice,
          minRating: validated.minRating,
          badges: validated.badges,
          inStock: validated.inStock,
          sort: validated.sort,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: (error as unknown as { errors: unknown }).errors,
        },
        { status: 400 },
      );
    }

    logger.error("[Souq Search] Search failed", { error });

    return NextResponse.json(
      {
        error: "Search failed",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}

/**
 * Calculate price range buckets for faceting
 */
function calculatePriceRanges(prices: number[]): Record<string, number> {
  if (prices.length === 0) return {};

  const ranges = {
    "Under 50 SAR": 0,
    "50 - 100 SAR": 0,
    "100 - 200 SAR": 0,
    "200 - 500 SAR": 0,
    "500 - 1000 SAR": 0,
    "Above 1000 SAR": 0,
  };

  prices.forEach((price) => {
    if (price < 50) ranges["Under 50 SAR"]++;
    else if (price < 100) ranges["50 - 100 SAR"]++;
    else if (price < 200) ranges["100 - 200 SAR"]++;
    else if (price < 500) ranges["200 - 500 SAR"]++;
    else if (price < 1000) ranges["500 - 1000 SAR"]++;
    else ranges["Above 1000 SAR"]++;
  });

  return ranges;
}
