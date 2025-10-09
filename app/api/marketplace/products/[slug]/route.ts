import { NextRequest, NextResponse } from 'next/server';
import { resolveMarketplaceContext } from '@/lib/marketplace/context';
import { findProductBySlug } from '@/lib/marketplace/search';
import { connectToDatabase } from '@/lib/mongo';
import Category from '@/server/models/marketplace/Category';
import { serializeCategory } from '@/lib/marketplace/serializers';

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * @openapi
 * /api/marketplace/products/[slug]:
 *   get:
 *     summary: marketplace/products/[slug] operations
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
export async function GET(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const context = await resolveMarketplaceContext(request);
    const slug = decodeURIComponent(params.slug);
    await connectToDatabase();
    const product = await findProductBySlug(context.orgId, slug);

    if (!product) {
      return NextResponse.json({ ok: false, error: 'Product not found' }, { status: 404 });
    }

    const category = await Category.findOne({ _id: product.categoryId, orgId: context.orgId }).lean();

    return NextResponse.json({
      ok: true,
      data: {
        product,
        category: category ? serializeCategory(category) : null
      }
    });
  } catch (error) {
    console.error('Failed to load product details', error);
    return NextResponse.json({ ok: false, error: 'Unable to fetch product' }, { status: 500 });
  }
}
