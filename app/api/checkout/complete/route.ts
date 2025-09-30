import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/db/mongoose';
import Subscription from '@/db/models/Subscription';
import { finalizePayTabsTransaction, normalizePayTabsPayload } from '@/services/paytabs';

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();

  if (body.payload) {
    const normalized = normalizePayTabsPayload(body.payload);
    const result = await finalizePayTabsTransaction(normalized);
    return NextResponse.json(result);
  }

  const subscriptionId = body.subscriptionId;
  const cartId = body.cartId;

  const subscription = subscriptionId
    ? await Subscription.findById(subscriptionId)
    : await Subscription.findOne({ 'paytabs.cart_id': cartId });

  if (!subscription) {
    return NextResponse.json({ error: 'SUBSCRIPTION_NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({
    ok: subscription.status === 'ACTIVE',
    subscription,
  });
}

