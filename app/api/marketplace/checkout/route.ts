import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveMarketplaceContext } from '@/src/lib/marketplace/context';
import { dbConnect } from '@/src/db/mongoose';
import { getOrCreateCart, recalcCartTotals } from '@/src/lib/marketplace/cart';
import { serializeOrder } from '@/src/lib/marketplace/serializers';

const CheckoutSchema = z.object({
  shipTo: z
    .object({
      address: z.string().min(1),
      contact: z.string().min(1),
      phone: z.string().optional()
    })
    .optional()
});

export async function POST(request: NextRequest) {
  try {
    const context = await resolveMarketplaceContext(request);
    if (!context.userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const payload = CheckoutSchema.parse(body ?? {});
    await dbConnect();

    const cart = await getOrCreateCart(context.orgId, context.userId);
    if (!cart.lines.length) {
      return NextResponse.json({ ok: false, error: 'Cart is empty' }, { status: 400 });
    }

    recalcCartTotals(cart);
    cart.currency = cart.lines[0]?.currency ?? cart.currency ?? 'SAR';
    cart.shipTo = payload.shipTo ?? cart.shipTo;

    const approvalThreshold = Number(process.env.MARKETPLACE_APPROVAL_THRESHOLD ?? 5000);
    if (cart.totals.grand >= approvalThreshold) {
      cart.status = 'APPROVAL';
      cart.approvals = {
        required: true,
        status: 'PENDING'
      };
    } else {
      cart.status = 'PENDING';
      cart.approvals = {
        required: false,
        status: 'APPROVED'
      };
    }

    await cart.save();

    return NextResponse.json({
      ok: true,
      data: serializeOrder(cart)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: 'Invalid payload', details: error.issues }, { status: 400 });
    }
    console.error('Marketplace checkout failed', error);
    return NextResponse.json({ ok: false, error: 'Unable to complete checkout' }, { status: 500 });
  }
}
