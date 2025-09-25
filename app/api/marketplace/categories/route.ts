import { NextRequest, NextResponse } from 'next/server';

import { dbConnect } from '@/src/db/mongoose';
import { resolveMarketplaceContext } from '@/src/lib/marketplace/context';
import Category from '@/src/models/marketplace/Category';
import { serializeCategory } from '@/src/lib/marketplace/serializers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CATEGORY_ALLOWED_ROLES = new Set([
  'ADMIN',
  'STAFF',
  'SUPER_ADMIN',
  'CORPORATE_ADMIN'
]);

function sortCategories<T extends { name?: { en?: string }; createdAt?: Date | string | number }>(nodes: T[]): T[] {
  return [...nodes].sort((a, b) => {
    const aName = a.name?.en ?? '';
    const bName = b.name?.en ?? '';
    if (aName && bName) {
      return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
    }
    const aTimestamp = a?.createdAt ? new Date(a.createdAt as any).getTime() : Number.POSITIVE_INFINITY;
    const bTimestamp = b?.createdAt ? new Date(b.createdAt as any).getTime() : Number.POSITIVE_INFINITY;
    if (Number.isFinite(aTimestamp) && Number.isFinite(bTimestamp)) {
      return aTimestamp - bTimestamp;
    }
    return 0;
  });
}

export async function GET(request: NextRequest) {
  try {
    const context = await resolveMarketplaceContext(request);
    const normalizedRole = context.role ? context.role.toUpperCase() : '';

    if (!CATEGORY_ALLOWED_ROLES.has(normalizedRole)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const categories = await Category.find({ orgId: context.orgId })
      .sort({ createdAt: 1 })
      .lean();
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
      const nodes = sortCategories(parentMap.get(parentId ?? 'root') ?? []);
      return nodes.map(node => ({
        ...node,
        children: buildTree(node._id)
      }));
    };

    const tree = buildTree(undefined);

    return NextResponse.json(
      {
        ok: true,
        data: serialized,
        tree,
        meta: {
          count: serialized.length,
          tenant: context.tenantKey
        }
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Failed to fetch marketplace categories', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to fetch categories' },
      { status: 500 }
    );
  }
}
