import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveMarketplaceContext } from '@/lib/marketplace/context';
import { connectToDatabase } from '@/lib/mongodb-unified';
import Order from '@/server/models/marketplace/Order';
import { serializeOrder } from '@/lib/marketplace/serializers';
import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

const QuerySchema = z.object({
  status: z.string().optional()
});

export const dynamic = 'force-dynamic';
/**
 * @openapi
 * /api/marketplace/orders:
 *   get:
 *     summary: marketplace/orders operations
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
    const context = await resolveMarketplaceContext(request);
    if (!context.userId) {
      return unauthorizedError();
    }

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = QuerySchema.parse(params);
    await connectToDatabase();

    const filter: any = { orgId: context.orgId, status: { $ne: 'CART' } };

    if (context.role === 'VENDOR') {
      filter.vendorId = context.userId;
    } else {
      filter.buyerUserId = context.userId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(50);

    return createSecureResponse({
      ok: true,
      data: orders.map(order => serializeOrder(order))
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, request);
    }
    console.error('Marketplace orders fetch failed', error);
    return createSecureResponse({ error: 'Unable to load orders' }, 500, request);
  }
}



