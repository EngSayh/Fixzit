import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveMarketplaceContext } from '@/src/lib/marketplace/context';
import { db } from '@/src/lib/mongo';
import Product from '@/src/models/marketplace/Product';
import { serializeProduct } from '@/src/lib/marketplace/serializers';
import { objectIdFrom } from '@/src/lib/marketplace/objectIds';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'CORPORATE_ADMIN', 'PROCUREMENT', 'ADMIN']);

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});

const ProductSchema = z.object({
  categoryId: z.string(),
  sku: z.string().min(1),
  slug: z.string().min(1),
  title: z.object({ en: z.string().min(1), ar: z.string().optional() }),
  summary: z.string().optional(),
  brand: z.string().optional(),
  standards: z.array(z.string()).optional(),
  specs: z.record(z.string(), z.any()).optional(),
  media: z.array(z.object({ url: z.string().url(), role: z.enum(['GALLERY', 'MSDS', 'COA']).optional(), title: z.string().optional() })).optional(),
  buy: z.object({
    price: z.number().positive(),
    currency: z.string().min(1),
    uom: z.string().min(1),
    minQty: z.number().positive().optional(),
    leadDays: z.number().int().nonnegative().optional()
  }),
  stock: z.object({ onHand: z.number().int().nonnegative(), reserved: z.number().int().nonnegative(), location: z.string().optional() }).optional(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional()
});

export async function GET(request: NextRequest) {
  try {
    if (process.env.MARKETPLACE_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'Marketplace endpoint not available in this deployment' }, { status: 501 });
    }
    const { dbConnect } = await import('@/src/db/mongoose');
    await dbConnect();
    const ProductMod = await import('@/src/models/marketplace/Product').catch(() => null);
    const Product = ProductMod && (ProductMod.default || ProductMod);
    if (!Product) {
      return NextResponse.json({ success: false, error: 'Marketplace Product dependencies are not available in this deployment' }, { status: 501 });
    }
    const context = await resolveMarketplaceContext(request);
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = QuerySchema.parse(params);
    await db;

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      (Product as any).find({ orgId: context.orgId }).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
      (Product as any).countDocuments({ orgId: context.orgId })
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        items: items.map(item => serializeProduct(item as any)),
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          pages: Math.ceil(total / query.limit)
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: 'Invalid parameters', details: error.issues }, { status: 400 });
    }
    console.error('Marketplace products list failed', error);
    return NextResponse.json({ ok: false, error: 'Unable to list products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (process.env.MARKETPLACE_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'Marketplace endpoint not available in this deployment' }, { status: 501 });
    }
    const { dbConnect } = await import('@/src/db/mongoose');
    await dbConnect();
    const ProductMod = await import('@/src/models/marketplace/Product').catch(() => null);
    const Product = ProductMod && (ProductMod.default || ProductMod);
    if (!Product) {
      return NextResponse.json({ success: false, error: 'Marketplace Product dependencies are not available in this deployment' }, { status: 501 });
    }
    const context = await resolveMarketplaceContext(request);
    if (!context.userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!context.role || !ADMIN_ROLES.has(context.role)) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const payload = ProductSchema.parse(body);
    await db;

    const product = await (Product as any).create({
      ...payload,
      orgId: context.orgId,
      categoryId: objectIdFrom(payload.categoryId),
      vendorId: payload.brand ? objectIdFrom(`${context.orgId}-${payload.brand}`) : undefined,
      status: payload.status ?? 'ACTIVE'
    });

    return NextResponse.json({ ok: true, data: serializeProduct(product) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: 'Invalid payload', details: error.issues }, { status: 400 });
    }
    if ((error as any).code === 11000) {
      return NextResponse.json({ ok: false, error: 'Duplicate SKU or slug' }, { status: 409 });
    }
    console.error('Marketplace product creation failed', error);
    return NextResponse.json({ ok: false, error: 'Unable to create product' }, { status: 500 });
  }
}
