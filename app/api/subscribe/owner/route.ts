import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/db/mongoose';
import { createSubscriptionCheckout } from '@/services/checkout';
import { getSessionUser } from '@/server/middleware/withAuthRbac';

export async function POST(req: NextRequest) {
  try {
    // Authentication and authorization
    const user = await getSessionUser(req);
    
    await dbConnect();
    const body = await req.json();
    
    // Authorization: must be admin or subscribing for self
    const isAdmin = ['super_admin', 'corporate_admin'].includes(user.role);
    const isSelf = body.ownerUserId === user.id;
    
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

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
  } catch (error: any) {
    if (error.message === 'Unauthenticated') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    throw error;
  }
}


