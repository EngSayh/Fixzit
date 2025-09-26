import { NextRequest, NextResponse } from 'next/server';
import { createPaymentPage } from '@/src/lib/paytabs';
import { getSessionUser } from '@/src/server/middleware/withAuthRbac';
import { Invoice } from '@/src/server/models/Invoice';
import { db } from '@/src/lib/mongo';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    
    const paymentSchema = z.object({
      invoiceId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid invoice ID'),
      returnUrl: z.string().url().optional(),
      cancelUrl: z.string().url().optional(),
      paymentMethod: z.enum(['credit_card', 'bank_transfer', 'wallet']).optional()
    });
    
    const body = paymentSchema.parse(await req.json());
    const { invoiceId } = body;

    await db;
    const invoice = await (Invoice as any).findOne({ 
      _id: invoiceId, 
      tenantId: user.tenantId 
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 });
    }

    // Create payment request
    const paymentRequest = {
      amount: invoice.total,
      currency: invoice.currency,
      customerDetails: {
        name: invoice.recipient.name,
        email: invoice.recipient.email || 'customer@fixzit.co',
        phone: invoice.recipient.phone || '+966500000000',
        address: invoice.recipient.address || 'Saudi Arabia',
        city: 'Riyadh',
        state: 'Riyadh',
        country: 'SA',
        zip: '11564'
      },
      description: `Payment for Invoice ${invoice.number}`,
      invoiceId: invoice._id.toString(),
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payments/success`,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/callback`
    };

    const paymentResponse = await createPaymentPage(paymentRequest);

    if (paymentResponse.success) {
      // Update invoice with payment transaction
      invoice.history.push({
        action: 'PAYMENT_INITIATED',
        performedBy: user.id,
        performedAt: new Date(),
        details: `Payment initiated with transaction ${paymentResponse.transactionId}`
      });
      await invoice.save();

      return NextResponse.json({
        success: true,
        paymentUrl: paymentResponse.paymentUrl,
        transactionId: paymentResponse.transactionId
      });
    } else {
      return NextResponse.json({ 
        error: paymentResponse.error || 'Payment initialization failed' 
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Payment creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create payment' 
    }, { status: 500 });
  }
}
