import { NextRequest, NextResponse } from 'next/server';
import { generateZATCAQR } from '@/lib/zatca';
import { validateCallbackRaw } from '@/src/lib/paytabs';

/**
 * HTTP POST handler for PayTabs payment callbacks.
 *
 * Validates the raw request signature, parses the callback payload, and updates payment status.
 * On an approved transaction (`resp_status === 'A'`) it validates the numeric `amount`, computes VAT,
 * and generates a ZATCA QR invoice. In production the generated invoice should be persisted (not done here).
 *
 * Behavior by response:
 * - Returns 401 if the signature validation fails.
 * - Returns 400 if the amount is not a finite positive number.
 * - Returns 500 on unexpected internal errors.
 *
 * The successful response body indicates whether the order is `PAID` or `FAILED` and includes the provider message.
 *
 * @returns A NextResponse containing a JSON object with `{ ok: boolean, status?: 'PAID'|'FAILED', message?: string, error?: string }`
 */
export async function POST(req: NextRequest) {
  try {
    // Read raw body for signature validation
    const raw = await req.text();
    const isValid = await validateCallbackRaw(raw, req.headers.get('signature'));
    if (!isValid) {
      return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(raw);
    const { tran_ref, cart_id, resp_status, resp_message, amount } = body;
    
    // Update order status based on payment result
    const success = resp_status === 'A';
    
    if (success) {
      const total = Number(amount);
      if (!Number.isFinite(total) || total <= 0) {
        return NextResponse.json({ ok: false, error: 'Invalid amount' }, { status: 400 });
      }
      // Generate invoice with ZATCA QR
      const zatcaQR = await generateZATCAQR({
        sellerName: 'Fixzit Enterprise',
        vatNumber: '300123456789012',
        timestamp: new Date().toISOString(),
        total,
        vat: +(total * 0.15).toFixed(2)
      });
      
      // In production, save to database
      console.log('Payment successful for order:', cart_id);
      console.log('ZATCA QR generated:', zatcaQR.base64);
    }
    
    return NextResponse.json({
      ok: true,
      status: success ? 'PAID' : 'FAILED',
      message: resp_message
    });
  } catch (error) {
    console.error('PayTabs callback error:', error);
    return NextResponse.json(
      { ok: false, error: 'Callback processing failed' },
      { status: 500 }
    );
  }
}
