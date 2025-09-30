import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveMarketplaceContext } from '@/src/lib/marketplace/context';
import { connectToDatabase } from '@/src/lib/mongodb-unified';
import Product from '@/src/models/marketplace/Product';
import { serializeProduct } from '@/src/lib/marketplace/serializers';
import { objectIdFrom } from '@/src/lib/marketplace/objectIds';

const UpsertSchema = z.object({
  _id: z.string().optional(),
  categoryId: z.string(),
  sku: z.string().min(1),
  slug: z.string().min(1),
  title: z.object({ en: z.string().min(1), ar: z.string().optional() }),
  summary: z.string().optional(),
  buy: z.object({ price: z.number().positive(), currency: z.string(), uom: z.string() }),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).default('ACTIVE')
});

export async function GET(request: NextRequest) {
  try {
    const context = await resolveMarketplaceContext(request);
    if (!context.userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const client = await connectToDatabase();

    const filter: any = { orgId: context.orgId };
    if (context.role === 'VENDOR') {
      filter.vendorId = context.userId;
    }

    const products = await Product.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json({ ok: true, data: products.map(product => serializeProduct(product as any)) });
  } catch (error) {
    console.error('Marketplace vendor products failed', error);
    return NextResponse.json({ ok: false, error: 'Unable to load vendor catalogue' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await resolveMarketplaceContext(request);
    if (!context.userId || context.role !== 'VENDOR') {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const payload = UpsertSchema.parse(body);
    const client = await connectToDatabase();

    const data = {
      orgId: context.orgId,
      vendorId: context.userId,
      categoryId: objectIdFrom(payload.categoryId),
      sku: payload.sku,
      slug: payload.slug,
      title: payload.title,
      summary: payload.summary,
      buy: payload.buy,
      status: payload.status
    };

    let product;
    if (payload._id) {
      product = await Product.findOneAndUpdate(
        { _id: objectIdFrom(payload._id), orgId: context.orgId, vendorId: context.userId },
        { $set: data },
        { new: true, runValidators: true }
      );
    } else {
      product = await Product.create(data);
    }

    if (!product) {
      return NextResponse.json({ ok: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: serializeProduct(product) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: 'Invalid payload', details: error.issues }, { status: 400 });
    }
    if ((error as any).code === 11000) {
      return NextResponse.json({ ok: false, error: 'Duplicate SKU or slug' }, { status: 409 });
    }
    console.error('Marketplace vendor product upsert failed', error);
    return NextResponse.json({ ok: false, error: 'Unable to save product' }, { status: 500 });
  }
}

