import { NextRequest} from 'next/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { resolveMarketplaceContext } from '@/lib/marketplace/context';
import { logger } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import Order from '@/server/models/marketplace/Order';
import { logger } from '@/lib/logger';
import { serializeOrder } from '@/lib/marketplace/serializers';
import { logger } from '@/lib/logger';
import { unauthorizedError, zodValidationError} from '@/server/utils/errorResponses';
import { logger } from '@/lib/logger';
import { createSecureResponse } from '@/server/security/headers';
import { logger } from '@/lib/logger';

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

    const filter: Record<string, unknown> = { orgId: context.orgId, status: { $ne: 'CART' } };

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
    logger.error('Marketplace orders fetch failed', error instanceof Error ? error.message : 'Unknown error');
    return createSecureResponse({ error: 'Unable to load orders' }, 500, request);
  }
}



