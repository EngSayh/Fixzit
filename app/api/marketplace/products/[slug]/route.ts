// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { MarketplaceProduct } from '@/src/server/models/MarketplaceProduct';
import { getTenantFromRequest } from '@/src/server/utils/tenant';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const tenantId = getTenantFromRequest(req) || 'demo-tenant';
    const doc = await (MarketplaceProduct as any).findOne({ tenantId, slug: params.slug });
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const buyBox = {
      price: doc?.prices?.[0]?.listPrice ?? null,
      currency: doc?.prices?.[0]?.currency ?? 'SAR',
      inStock: (doc?.inventories?.[0]?.onHand || 0) > 0,
      leadDays: doc?.inventories?.[0]?.leadDays ?? 3
    };

    return NextResponse.json({ product: doc, buyBox });
  } catch (error) {
    console.error('pdp error', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

