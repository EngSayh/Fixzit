import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PaymentSchema = z.object({
  orderId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default('SAR'),
  customerEmail: z.string().email(),
  customerName: z.string(),
  customerPhone: z.string()
});

// PayTabs payment page creation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = PaymentSchema.parse(body);
    
    const serverKey = process.env.PAYTABS_API_SERVER_KEY || process.env.PAYTABS_SERVER_KEY;
    if (!serverKey) {
      return NextResponse.json({ ok: false, error: 'PAYTABS server key not configured' }, { status: 500 });
    }

    const payload = {
      profile_id: process.env.PAYTABS_PROFILE_ID || '85119',
      tran_type: 'sale',
      tran_class: 'ecom',
      cart_id: data.orderId,
      cart_currency: data.currency,
      cart_amount: data.amount.toFixed(2),
      cart_description: `Fixzit Order ${data.orderId}`,
      customer_details: {
        name: data.customerName,
        email: data.customerEmail,
        phone: data.customerPhone,
        country: 'SA'
      },
      callback: `${process.env.NEXTAUTH_URL}/api/payments/paytabs/callback`,
      return: `${process.env.NEXTAUTH_URL}/marketplace/order-success`
    };
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch('https://secure.paytabs.sa/payment/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': serverKey
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json({ ok: false, error: 'PayTabs request failed', status: response.status, body: text }, { status: 502 });
    }

    const result = await response.json();
    
    if (result.redirect_url) {
      return NextResponse.json({
        ok: true,
        paymentUrl: result.redirect_url,
        tranRef: result.tran_ref
      });
    } else {
      return NextResponse.json(
        { ok: false, error: 'Payment initialization failed', details: result },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('PayTabs error:', error);
    return NextResponse.json(
      { ok: false, error: 'Payment processing failed' },
      { status: 500 }
    );
  }
}
