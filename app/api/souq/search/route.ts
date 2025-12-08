import { NextRequest, NextResponse } from "next/server";
import { searchClient, INDEXES } from "@/lib/meilisearch";
import { withMeiliResilience } from "@/lib/meilisearch-resilience";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";
import { resolveMarketplaceContext } from "@/lib/marketplace/context";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

const MAX_QUERY_LENGTH = 256;
const MAX_BADGES = 10;
const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  VALIDATION: "VALIDATION_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
  UPSTREAM: "UPSTREAM_ERROR",
} as const;

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
 * - isActive: Filter by active status (server default: true)
 * - sort: Sort order (relevance|price_asc|price_desc|rating|newest)
 * - page: Page number (default: 1)
 * - limit: Items per page (1-100, default: 20)
 *
 * @returns Search results with facets and pagination metadata
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting: 120 req/min for public search
    const clientIp = getClientIP(req);
    const rl = await smartRateLimit(`/api/souq/search:${clientIp}`, 120, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

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
      sort: searchParams.get("sort") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    };

    const validated = searchQuerySchema.parse(params);

    // Cap query length defensively
    const sanitizedQuery =
      validated.q && validated.q.length > MAX_QUERY_LENGTH
        ? validated.q.slice(0, MAX_QUERY_LENGTH)
        : validated.q;

    // Limit badge list length
    const badgeListRaw =
      validated.badges?.split(",").filter((b) => b.trim().length > 0) ?? [];
    if (badgeListRaw.length > MAX_BADGES) {
      return NextResponse.json(
        {
          error: "Too many badges",
          errorCode: ERROR_CODES.BAD_REQUEST,
        },
        { status: 400 },
      );
    }

    // Build filter array
    const filters: string[] = [];

    // SECURITY: Escape filter values to prevent Meilisearch filter injection
    // Escapes quotes and special characters that could alter filter logic
    const escapeFilterValue = (v: string): string => {
      // Remove any control characters (0x00-0x1f) and escape quotes
      let sanitized = "";
      for (let i = 0; i < v.length; i++) {
        const charCode = v.charCodeAt(i);
        // Skip control characters (0x00-0x1f)
        if (charCode >= 0x20) {
          sanitized += v[i];
        }
      }
      return `"${sanitized.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
    };

    // Enforce tenant scoping from trusted context (session first, marketplace fallback)
    const sessionUser = await getSessionUser(req).catch(() => null);
    const marketplaceContext = await resolveMarketplaceContext(req);
    const orgIdFromContext =
      sessionUser?.orgId?.toString() || marketplaceContext?.orgId?.toString();
    const correlationId =
      sessionUser?.id || marketplaceContext?.correlationId || undefined;

    // Allowlist public catalogs via env (comma-separated ObjectIds)
    // SECURITY FIX: Empty allowlist = NO public access (strict default)
    const publicOrgAllowlist = new Set(
      (process.env.MARKETPLACE_PUBLIC_ORGS || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    );
    
    // SECURITY: Authenticated users (session or marketplace token) are allowed
    const isAuthenticated = Boolean(sessionUser?.id || marketplaceContext?.userId);
    
    // SECURITY: Unauthenticated users must have org in explicit allowlist
    // Empty allowlist means NO public access without authentication
    const isPublicAllowed = isAuthenticated || 
      (orgIdFromContext && 
       publicOrgAllowlist.size > 0 && 
       publicOrgAllowlist.has(orgIdFromContext));
    
    // SECURITY: Reject unauthorized context marker from resolveMarketplaceContext
    const isUnauthorizedContext = orgIdFromContext === "000000000000000000000000" || 
                                   marketplaceContext?.tenantKey === "__unauthorized__";

    if (!orgIdFromContext || !isPublicAllowed || isUnauthorizedContext) {
      logger.warn("[Souq Search] Unauthorized org access attempt", {
        orgIdFromContext,
        clientIp,
        correlationId,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Apply isActive filter (server-default true to avoid inactive exposure)
    const effectiveIsActive = validated.isActive ?? true;
    filters.push(`isActive = ${effectiveIsActive ? "true" : "false"}`);

    if (validated.category) {
      filters.push(`category = ${escapeFilterValue(validated.category)}`);
    }

    if (validated.subcategory) {
      filters.push(`subcategory = ${escapeFilterValue(validated.subcategory)}`);
    }

    if (validated.brandId) {
      filters.push(`brand = ${escapeFilterValue(validated.brandId)}`);
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

    if (badgeListRaw.length > 0) {
      // SECURITY: Escape each badge value to prevent filter injection
      const badgeFilters = badgeListRaw.map(
        (badge) => `badges = ${escapeFilterValue(badge.trim())}`,
      );
      filters.push(`(${badgeFilters.join(" OR ")})`);
    }

    if (validated.inStock) {
      filters.push("inStock = true");
    }

    // SECURITY: Tenant isolation – require org scope derived from trusted context
    filters.push(`orgId = ${escapeFilterValue(orgIdFromContext)}`);

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

    const startedAt = Date.now();
    const results = await withMeiliResilience("products-search", "search", () =>
      index.search(sanitizedQuery, {
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
    const durationMs = Date.now() - startedAt;

    // Calculate price range facets
    const priceRanges = calculatePriceRanges(
      results.hits.map((hit) => {
        const value = (hit as { price?: number }).price;
        return typeof value === "number" ? value : 0;
      }),
    );

    const totalHits = results.estimatedTotalHits || results.hits.length;
    const totalPages = Math.ceil(totalHits / validated.limit);

    logger.info("[Souq Search] success", {
      orgId: orgIdFromContext,
      correlationId,
      requestId: req.headers.get("x-request-id") || undefined,
      sort: validated.sort,
      page: validated.page,
      limit: validated.limit,
      durationMs,
      filtersCount: filters.length,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        hits: results.hits,
        query: sanitizedQuery,
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
          isActive: effectiveIsActive,
          sort: validated.sort,
        },
      },
    });
    response.headers.set("X-Correlation-Id", correlationId ?? "");
    response.headers.set("X-RateLimit-Limit", "120");
    response.headers.set("X-RateLimit-Remaining", rl.remaining.toString());
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          errorCode: ERROR_CODES.VALIDATION,
          details: (error as unknown as { errors: unknown }).errors,
        },
        { status: 400 },
      );
    }

    logger.error("[Souq Search] Search failed", error as Error);

    return NextResponse.json(
      {
        error: "Search failed",
        errorCode: ERROR_CODES.UPSTREAM,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 503 },
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
