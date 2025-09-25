import { NextRequest, NextResponse } from 'next/server';
import { resolveMarketplaceContext } from '@/src/lib/marketplace/context';
import { findProductBySlug } from '@/src/lib/marketplace/search';
import { dbConnect } from '@/src/db/mongoose';
import Category from '@/src/models/marketplace/Category';
import { serializeCategory } from '@/src/lib/marketplace/serializers';

interface RouteParams {
  params: { slug: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await resolveMarketplaceContext(request);
    const slug = decodeURIComponent(params.slug);
    await dbConnect();
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
