import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import SubscriptionInvoice from '@/src/models/SubscriptionInvoice';
import Subscription from '@/src/models/Subscription';
import PaymentMethod from '@/src/models/PaymentMethod';

export async function POST(req: NextRequest) {
  await dbConnect();
  const payload = await req.json().catch(()=>null);
  const data = payload || {}; // if using return-url (form-data), create a separate handler
  const tranRef = data.tran_ref || data.tranRef;
  const cartId  = data.cart_id || data.cartId;
  const token   = data.token;

  const subId = cartId?.replace('SUB-','');
  const sub = await Subscription.findById(subId);
  if (!sub) return NextResponse.json({ error: 'SUB_NOT_FOUND' }, { status: 400 });

  // Find invoice
  const inv = await SubscriptionInvoice.findOne({ subscriptionId: sub._id, status: 'pending' });
  if (!inv) return NextResponse.json({ error: 'INV_NOT_FOUND' }, { status: 400 });

  const statusOk = (data.payment_result?.response_status || data.respStatus) === 'A';
  if (!statusOk) {
    inv.status = 'failed'; inv.errorMessage = data.payment_result?.response_message || data.respMessage;
    await inv.save(); return NextResponse.json({ ok: false });
  }

  inv.status = 'paid'; inv.paytabsTranRef = tranRef; await inv.save();

  if (token && sub.billingCycle === 'monthly') {
    const pm = await PaymentMethod.create({
      customerId: sub.customerId, token, scheme: data.payment_info?.card_scheme, last4: (data.payment_info?.payment_description||'').slice(-4),
      expMonth: data.payment_info?.expiryMonth, expYear: data.payment_info?.expiryYear
    });
    sub.paytabsTokenId = pm._id;
    await sub.save();
  }

  return NextResponse.json({ ok: true });
}
