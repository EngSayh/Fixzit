import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import SubscriptionInvoice from '@/src/models/SubscriptionInvoice';
import Subscription from '@/src/models/Subscription';
import PaymentMethod from '@/src/models/PaymentMethod';
import { verifyPayment } from '@/src/lib/paytabs';

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

  // Harden: re-verify with PayTabs and cross-check identity + totals
  const verified = await verifyPayment(tranRef, sub.paytabsRegion || process.env.PAYTABS_REGION);
  const vStatus = verified?.payment_result?.response_status;
  const vCartId = String(verified?.cart_id || '');
  const vAmount = Number(verified?.cart_amount || verified?.tran_total || 0);
  const vCurr   = String(verified?.cart_currency || verified?.tran_currency || '').toUpperCase();
  const invAmt  = Number(inv.amount || 0);
  const invCur  = String(inv.currency || 'USD').toUpperCase();

  const ok = vStatus === 'A' && vCartId === cartId && Math.abs(vAmount - invAmt) < 0.01 && (!vCurr || vCurr === invCur);
  if (!ok) {
    inv.status = 'failed';
    inv.errorMessage = verified?.payment_result?.response_message || data.payment_result?.response_message || 'VERIFICATION_MISMATCH';
    await inv.save();
    return NextResponse.json({ ok: false }, { status: 409 });
  }

  inv.status = 'paid';
  inv.paytabsTranRef = tranRef;
  await inv.save();

  if ((token || verified?.token || verified?.card_token) && sub.billingCycle === 'monthly') {
    const pm = await PaymentMethod.create({
      customerId: sub.customerId,
      token: token || verified?.token || verified?.card_token,
      scheme: data.payment_info?.card_scheme || verified?.payment_info?.card_scheme,
      last4: (data.payment_info?.payment_description||'').slice(-4),
      expMonth: data.payment_info?.expiryMonth || verified?.payment_info?.expiryMonth,
      expYear: data.payment_info?.expiryYear || verified?.payment_info?.expiryYear
    });
    sub.paytabsTokenId = pm._id;
    await sub.save();
  }

  return NextResponse.json({ ok: true });
}
