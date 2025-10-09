import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';
import { resolveMarketplaceContext } from '@/lib/marketplace/context';
import { searchProducts } from '@/lib/marketplace/search';
import Category from '@/server/models/marketplace/Category';
import { serializeCategory } from '@/lib/marketplace/serializers';
import { connectToDatabase } from '@/lib/mongodb-unified';

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

const QuerySchema = z.object({
  q: z.string().optional(),
  cat: z.string().optional(),
  brand: z.string().optional(),
  std: z.string().optional(),
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(24)
});

export const dynamic = 'force-dynamic';
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
      skip: (query.page - 1) * query.limit
    });

    const facetCategories = await Category.find({ _id: { $in: facets.categories }, orgId: context.orgId })
      .lean()
      .then(docs => docs.map(doc => serializeCategory(doc)));

    return NextResponse.json({
      ok: true,
      data: {
        items,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: pagination.total,
          pages: Math.ceil(pagination.total / query.limit)
        },
        facets: {
          brands: facets.brands,
          standards: facets.standards,
          categories: facetCategories.map(category => ({
            slug: category.slug,
            name: category.name?.en ?? category.name?.ar ?? category.slug
          }))
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, request);
    }
    console.error('Marketplace search failed', error);
    return createSecureResponse({ error: 'Search failed' }, 500, request);
  }
}



