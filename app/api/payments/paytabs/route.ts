import { NextRequest, NextResponse } from 'next/server';

type PaymentBody = {
  orderId: string;
  amount: number;
  currency?: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
};
function validatePaymentBody(body: any): PaymentBody {
  if (!body || typeof body !== 'object') throw new Error('Invalid body');
  const { orderId, amount, currency, customerEmail, customerName, customerPhone } = body;
  if (!orderId || typeof orderId !== 'string') throw new Error('orderId required');
  if (typeof amount !== 'number' || !(amount > 0)) throw new Error('amount must be positive number');
  if (!customerEmail || typeof customerEmail !== 'string') throw new Error('customerEmail required');
  if (!customerName || typeof customerName !== 'string') throw new Error('customerName required');
  if (!customerPhone || typeof customerPhone !== 'string') throw new Error('customerPhone required');
  return { orderId, amount, currency: currency || 'SAR', customerEmail, customerName, customerPhone };
}

// PayTabs payment page creation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = validatePaymentBody(body);
    
    const payload = {
      profile_id: process.env.PAYTABS_PROFILE_ID || '',
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
      callback: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}/api/payments/paytabs/callback`,
      return: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}/marketplace/order-success`
    };
    
    const baseUrl = process.env.PAYTABS_BASE_URL || 'https://secure.paytabs.sa';
    const response = await fetch(`${baseUrl}/payment/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.PAYTABS_SERVER_KEY || ''
      },
      body: JSON.stringify(payload)
    });
    
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
