import { NextRequest, NextResponse } from 'next/server';

import { dbConnect } from '@/src/db/mongoose';
import { resolveMarketplaceContext } from '@/src/lib/marketplace/context';
import Category from '@/src/models/marketplace/Category';
import { serializeCategory } from '@/src/lib/marketplace/serializers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sortCategories<T extends { name?: { en?: string }; createdAt?: Date }>(nodes: T[]): T[] {
  return [...nodes].sort((a, b) => {
    const aName = a.name?.en ?? '';
    const bName = b.name?.en ?? '';
    if (aName && bName) {
      return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
    }
    if (a.createdAt && b.createdAt) {
      return a.createdAt.getTime() - b.createdAt.getTime();
    }
    return 0;
  });
}

export async function GET(request: NextRequest) {
  try {
    const context = await resolveMarketplaceContext(request);
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
