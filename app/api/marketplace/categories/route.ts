import { NextRequest, NextResponse } from 'next/server';
import { getCollections } from '@/lib/db/collections';
import { z } from 'zod';

const QuerySchema = z.object({
  tenantId: z.string().optional()
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = QuerySchema.parse(Object.fromEntries(searchParams));

    const defaultTenant = process.env.NEXT_PUBLIC_MARKETPLACE_TENANT || 'demo-tenant';
    const tenantId = query.tenantId || defaultTenant;

    const { categories, products } = await getCollections();

    // Ensure we only return categories that currently have active products for the tenant
    const activeCategories = await products.distinct('categoryId', {
      tenantId,
      active: true
    }) as unknown[];

    const categoryIds = activeCategories
      .map(id => {
        if (!id) return null;
        if (typeof id === 'string') return id;
        if (typeof (id as any).toString === 'function') return (id as any).toString();
        return null;
      })
      .filter((value): value is string => Boolean(value));

    const categoryFilter = categoryIds.length ? { _id: { $in: categoryIds as readonly string[] } } : {};

    const categoryList = await categories
      .find(categoryFilter)
      .sort({ name: 1 })
      .toArray();

    const normalized = categoryList.map(item => ({
      id: typeof item._id === 'string' ? item._id : (item._id as any)?.toString?.() ?? String(item._id),
      name: item.name,
      slug: item.slug,
      parentId: item.parentId
        ? (typeof item.parentId === 'string'
            ? item.parentId
            : (item.parentId as any)?.toString?.() ?? String(item.parentId))
        : null,
      icon: item.icon ?? null
    }));

    return NextResponse.json({
      ok: true,
      data: {
        categories: normalized,
        tenantId
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Categories fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
