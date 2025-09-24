import { NextRequest, NextResponse } from 'next/server';
import { verifyPayment, validateCallbackRaw } from '@/src/lib/paytabs';
import { Invoice } from '@/src/server/models/Invoice';
import { db } from '@/src/lib/mongo';

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const signature = req.headers.get('signature') || '';

    // Validate callback signature
    const valid = await validateCallbackRaw(raw, signature);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(raw);
    const { tran_ref, cart_id, payment_result } = body;

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
        amount: parseFloat(body.cart_amount),
        method: body.payment_info.payment_method,
        reference: tran_ref,
        status: 'COMPLETED',
        transactionId: tran_ref,
        notes: `Payment via ${body.payment_info.card_scheme || body.payment_info.payment_method}`
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
        amount: parseFloat(body.cart_amount),
        method: body.payment_info?.payment_method || 'UNKNOWN',
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
