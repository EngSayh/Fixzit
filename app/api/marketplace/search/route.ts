/**
 * @description Full-text and faceted product search for the marketplace.
 * Supports filtering by category, brand, standards, price range.
 * Returns paginated results with matched products and category facets.
 * @route GET /api/marketplace/search
 * @access Public - Search is publicly available for marketplace browsing
 * @query {string} q - Search query text
 * @query {string} cat - Category ID filter
 * @query {string} brand - Brand name filter
 * @query {string} std - Standards/certifications filter
 * @query {number} min - Minimum price filter
 * @query {number} max - Maximum price filter
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 24, max: 100)
 * @returns {Object} products: array, pagination: metadata, categories: facets
 * @throws {400} If query parameters validation fails
 * @throws {500} If search engine error occurs
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { Types } from "mongoose";
import { resolveMarketplaceContext } from "@/lib/marketplace/context";
import { searchProducts } from "@/lib/marketplace/search";
import Category from "@/server/models/marketplace/Category";
import { serializeCategory } from "@/lib/marketplace/serializers";
import { connectToDatabase } from "@/lib/mongodb-unified";

import { zodValidationError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const QuerySchema = z.object({
  q: z.string().optional(),
  cat: z.string().optional(),
  brand: z.string().optional(),
  std: z.string().optional(),
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(24),
});

export const dynamic = "force-dynamic";
/**
 * @openapi
 * /api/marketplace/search:
 *   get:
 *     summary: marketplace/search operations
 *     tags: [marketplace]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 60, windowMs: 60_000, keyPrefix: "marketplace:search" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = QuerySchema.parse(params);
    const context = await resolveMarketplaceContext(request);
    await connectToDatabase();

    const categoryDoc = query.cat
      ? await Category.findOne({ orgId: context.orgId, slug: query.cat }).lean()
      : undefined;

    const categoryId = categoryDoc?._id as Types.ObjectId | undefined;

    const { items, pagination, facets } = await searchProducts({
      orgId: context.orgId,
      q: query.q,
      categoryId,
      brand: query.brand,
      standard: query.std,
      minPrice: query.min,
      maxPrice: query.max,
      limit: query.limit,
      skip: (query.page - 1) * query.limit,
    });

    // Fetch categories with error handling
    let facetCategories: ReturnType<typeof serializeCategory>[] = [];
    try {
      const categoryDocs = await Category.find({
        _id: { $in: facets.categories },
        orgId: context.orgId,
      }).lean();
      facetCategories = categoryDocs.map((doc) => serializeCategory(doc));
    } catch (error) {
      logger.error("Error fetching marketplace categories", error as Error);
      // Continue with empty categories rather than failing entire request
      facetCategories = [];
    }

    return NextResponse.json({
      ok: true,
      data: {
        items,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: pagination.total,
          pages: Math.ceil(pagination.total / query.limit),
        },
        facets: {
          brands: facets.brands,
          standards: facets.standards,
          categories: facetCategories.map((category) => {
            const cat = category as {
              slug?: string;
              name?: { en?: string; ar?: string };
            };
            return {
              slug: cat.slug || "",
              name: cat.name?.en ?? cat.name?.ar ?? cat.slug ?? "",
            };
          }),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, request);
    }
    // For unauthenticated/local verification flows, return a safe empty payload instead of 500
    const allowAnon = process.env.MARKETPLACE_ALLOW_ANON_SEARCH === "true";
    if (allowAnon) {
      logger.warn(
        "Marketplace search failed, returning empty result for anon/local run",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
      return createSecureResponse(
        {
          ok: true,
          data: {
            items: [],
            pagination: { page: 1, limit: 24, total: 0, pages: 0 },
            facets: {
              brands: [],
              standards: [],
              categories: [],
            },
          },
        },
        200,
        request,
      );
    }

    logger.error(
      "Marketplace search failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse({ error: "Search failed" }, 500, request);
  }
}
