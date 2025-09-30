import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/src/lib/mongodb-unified';
import Category from '@/src/models/marketplace/Category';
import { resolveMarketplaceContext } from '@/src/lib/marketplace/context';
import { serializeCategory } from '@/src/lib/marketplace/serializers';

export const dynamic = 'force-dynamic';
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
    return NextResponse.json({ ok: false, error: 'Unable to fetch categories' }, { status: 500 });
  }
}

