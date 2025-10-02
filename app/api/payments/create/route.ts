import { NextRequest, NextResponse } from 'next/server';
import { createPaymentPage } from '@/lib/paytabs';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { Invoice } from '@/server/models/Invoice';
import { connectToDatabase } from "@/lib/mongodb-unified";
import { z } from 'zod';

// Utility functions for API responses
const notFoundError = (resource: string) => NextResponse.json({ error: `${resource} not found` }, { status: 404 });
const validationError = (message: string) => NextResponse.json({ error: message }, { status: 400 });
const createSecureResponse = (data: any) => NextResponse.json(data);
const handleApiError = (error: any) => NextResponse.json({ error: 'API error occurred' }, { status: 500 });
const internalServerError = (message: string, error?: any) => NextResponse.json({ error: message }, { status: 500 });

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

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    await connectToDatabase();
    const invoice = await (Invoice as any).findOne({ 
      _id: invoiceId, 
      tenantId: user.orgId 
    });

    if (!invoice) {
      return notFoundError('Invoice');
    }
    
    if (invoice.status === 'paid') {
      return validationError('Invoice is already paid');
    }    // Create payment request
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

    const paymentResponse = await createPaymentPage(paymentRequest as any);

    if (paymentResponse.success) {
      // Update invoice with payment transaction
      invoice.history.push({
        action: 'PAYMENT_INITIATED',
        performedBy: user.id,
        performedAt: new Date(),
        details: `Payment initiated with transaction ${paymentResponse.transactionId}`
      });
      await invoice.save();

      return createSecureResponse({
        success: true,
        paymentUrl: paymentResponse.paymentUrl,
        transactionId: paymentResponse.transactionId
      });
    } else {
      return validationError(paymentResponse.error || 'Payment initialization failed');
    }
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return handleApiError(error);
    }
    return internalServerError('Failed to create payment', error);
  }
}


