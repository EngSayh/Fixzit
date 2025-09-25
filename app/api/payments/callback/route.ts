import { NextRequest, NextResponse } from 'next/server';
import { verifyPayment, validateCallback } from '@/src/lib/paytabs';
import { Invoice } from '@/src/server/models/Invoice';
import { db } from '@/src/lib/mongo';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('signature') ?? '';
  const rawBody = await req.text();

  // Validate callback signature against the raw payload bytes as provided by PayTabs
  if (!validateCallback(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: unknown;

  try {
    body = JSON.parse(rawBody);
  } catch (error) {
    console.error('Failed to parse PayTabs callback payload:', error);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const callback = body as Record<string, any>;
    const { tran_ref, cart_id, payment_result } = callback;

    if (!tran_ref || !cart_id || !payment_result) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const paymentInfo = (callback.payment_info ?? {}) as Record<string, any>;
    const paymentMethod = paymentInfo.payment_method ?? 'UNKNOWN';
    const cardScheme = paymentInfo.card_scheme ?? paymentMethod;

    // Verify payment with PayTabs
    const verification = await verifyPayment(tran_ref);

    await db;
    const invoice = await (Invoice as any).findById(cart_id);

    if (!invoice) {
      console.error('Invoice not found for payment callback:', cart_id);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Update invoice based on payment result
    if (payment_result.response_status === 'A' && verification.payment_result.response_status === 'A') {
      // Payment successful
      invoice.status = 'PAID';
      invoice.payments.push({
        date: new Date(),
        amount: parseFloat(callback.cart_amount),
        method: paymentMethod,
        reference: tran_ref,
        status: 'COMPLETED',
        transactionId: tran_ref,
        notes: `Payment via ${cardScheme}`
      });

      invoice.history.push({
        action: 'PAID',
        performedBy: 'SYSTEM',
        performedAt: new Date(),
        details: `Payment completed via PayTabs. Transaction: ${tran_ref}`
      });
    } else {
      // Payment failed
      invoice.payments.push({
        date: new Date(),
        amount: parseFloat(callback.cart_amount),
        method: paymentMethod,
        reference: tran_ref,
        status: 'FAILED',
        transactionId: tran_ref,
        notes: payment_result.response_message || 'Payment failed'
      });

      invoice.history.push({
        action: 'PAYMENT_FAILED',
        performedBy: 'SYSTEM',
        performedAt: new Date(),
        details: `Payment failed: ${payment_result.response_message}. Transaction: ${tran_ref}`
      });
    }

    await invoice.save();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Payment callback error:', error);
    return NextResponse.json({ 
      error: 'Failed to process payment callback' 
    }, { status: 500 });
  }
}
