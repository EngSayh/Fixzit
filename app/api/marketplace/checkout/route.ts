import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveMarketplaceContext } from '@/src/lib/marketplace/context';
import { db } from '@/src/lib/mongo';
import { getOrCreateCart, recalcCartTotals } from '@/src/lib/marketplace/cart';
import { rateLimit } from '@/src/server/security/rateLimit';
import { serializeOrder } from '@/src/lib/marketplace/serializers';
import { createSecureResponse } from '@/src/server/security/headers';

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

    // Rate limiting for checkout operations
    const key = `marketplace:checkout:${context.userId}`;
    const rl = rateLimit(key, 10, 300_000); // 10 checkouts per 5 minutes
    if (!rl.allowed) {
      return NextResponse.json({ ok: false, error: 'Checkout rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const payload = CheckoutSchema.parse(body ?? {});
    await db;

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

    return createSecureResponse({
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
