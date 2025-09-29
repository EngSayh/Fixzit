import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import { createSubscriptionCheckout } from '@/src/services/checkout';

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();

  if (!body.ownerUserId) {
    return NextResponse.json({ error: 'OWNER_REQUIRED' }, { status: 400 });
  }

  if (!Array.isArray(body.modules) || body.modules.length === 0) {
    return NextResponse.json({ error: 'MODULES_REQUIRED' }, { status: 400 });
  }

  if (!body.customer?.email) {
    return NextResponse.json({ error: 'CUSTOMER_EMAIL_REQUIRED' }, { status: 400 });
  }

  const seats = Number(body.seats);
  if (!Number.isFinite(seats) || seats <= 0) {
    return NextResponse.json({ error: 'INVALID_SEAT_COUNT' }, { status: 400 });
  }

  const result = await createSubscriptionCheckout({
    subscriberType: 'OWNER',
    ownerUserId: body.ownerUserId,
    modules: body.modules,
    seats,
    billingCycle: body.billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY',
    currency: body.currency ?? 'USD',
    customer: body.customer,
    priceBookId: body.priceBookId,
    metadata: {
      ownerGroup: body.ownerGroup,
    },
  });

  return NextResponse.json(result);
}
