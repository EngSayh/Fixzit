import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import Category from '@/server/models/marketplace/Category';
import { resolveMarketplaceContext } from '@/lib/marketplace/context';
import { serializeCategory } from '@/lib/marketplace/serializers';

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

export const dynamic = 'force-dynamic';
/**
 * @openapi
 * /api/marketplace/categories:
 *   get:
 *     summary: marketplace/categories operations
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
    await connectToDatabase();
    const categories = await Category.find({ orgId: context.orgId }).sort({ createdAt: 1 }).lean();
    const serialized = categories.map(category => serializeCategory(category));

    const parentMap = new Map<string, any[]>();
    serialized.forEach(category => {
      const parentId = category.parentId ?? 'root';
      if (!parentMap.has(parentId)) {
        parentMap.set(parentId, []);
      }
      parentMap.get(parentId)!.push(category);
    });

    const buildTree = (parentId: string | undefined): any[] => {
      const nodes = parentMap.get(parentId ?? 'root') ?? [];
      return nodes.map(node => ({
        ...node,
        children: buildTree(node._id)
      }));
    };

    const tree = buildTree(undefined);

    return NextResponse.json({
      ok: true,
      data: serialized,
      tree
    });
  } catch (error) {
    console.error('Failed to fetch marketplace categories', error);
    return createSecureResponse({ error: 'Unable to fetch categories' }, 500, request);
  }
}



