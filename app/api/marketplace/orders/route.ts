import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveMarketplaceContext } from '@/src/lib/marketplace/context';
import { connectToDatabase } from '@/src/lib/mongodb-unified';
import Order from '@/src/models/marketplace/Order';
import { serializeOrder } from '@/src/lib/marketplace/serializers';
import { createSecureResponse } from '@/src/server/security/headers';

const QuerySchema = z.object({
  status: z.string().optional()
});

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const context = await resolveMarketplaceContext(request);
    if (!context.userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = QuerySchema.parse(params);
    await connectToDatabase();

    const filter: any = { orgId: context.orgId, status: { $ne: 'CART' } };

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
      return NextResponse.json({ ok: false, error: 'Invalid parameters', details: error.issues }, { status: 400 });
    }
    console.error('Marketplace orders fetch failed', error);
    return NextResponse.json({ ok: false, error: 'Unable to load orders' }, { status: 500 });
  }
}

