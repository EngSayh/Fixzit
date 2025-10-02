import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/db/mongoose';
import { createSubscriptionCheckout } from '@/services/checkout';
import { getSessionUser } from '@/server/middleware/withAuthRbac';

export async function POST(req: NextRequest) {
  try {
    // Authentication and authorization
    const user = await getSessionUser(req);
    
    // Only admins can create corporate subscriptions
    if (!['SUPER_ADMIN', 'CORPORATE_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    
    await dbConnect();
    const body = await req.json();
// Tenant isolation: ensure tenantId matches user's tenantId (unless SUPER_ADMIN)
    if (body.tenantId && body.tenantId !== user.tenantId && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN_TENANT_MISMATCH' }, { status: 403 });
    }

  if (!body.tenantId) {
    return NextResponse.json({ error: 'TENANT_REQUIRED' }, { status: 400 });
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
      subscriberType: 'CORPORATE',
      tenantId: body.tenantId,
      modules: body.modules,
      seats,
      billingCycle: body.billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY',
      currency: body.currency ?? 'USD',
      customer: body.customer,
      priceBookId: body.priceBookId,
      metadata: body.metadata,
    });

  return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === 'Unauthenticated') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    throw error;
  }
}




