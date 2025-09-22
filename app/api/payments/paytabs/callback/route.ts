import { NextRequest, NextResponse } from 'next/server';
import { generateZATCAQR } from '@/lib/zatca';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tran_ref, cart_id, resp_status, resp_message, amount } = body;
    
    // Update order status based on payment result
    const success = resp_status === 'A';
    
    if (success) {
      // Generate invoice with ZATCA QR
      const zatcaQR = await generateZATCAQR({
        sellerName: 'Fixzit Enterprise',
        vatNumber: '300123456789012',
        timestamp: new Date().toISOString(),
        total: parseFloat(amount),
        vat: parseFloat(amount) * 0.15
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
