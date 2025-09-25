import { NextRequest, NextResponse } from 'next/server';
import { createPaymentPage } from '@/src/lib/paytabs';
import { getSessionUser } from '@/src/server/middleware/withAuthRbac';
import { Invoice } from '@/src/server/models/Invoice';
import { db } from '@/src/lib/mongo';

/**
 * Initializes a payment for an invoice and returns a payment redirect URL.
 *
 * Validates the authenticated session and the provided `invoiceId`, ensures the invoice
 * exists and is not already paid, builds a payment payload from the invoice, and
 * calls the payment provider to create a payment page. On success the invoice's history
 * is appended with a PAYMENT_INITIATED entry and a JSON response containing the
 * provider redirect URL and transaction reference is returned.
 *
 * Responses:
 * - 200: { success: true, paymentUrl, transactionId } when payment page is created.
 * - 400: JSON error when `invoiceId` is missing, invoice is already paid, or payment initialization failed.
 * - 404: JSON error when invoice is not found for the authenticated user's tenant.
 * - 500: JSON error on unexpected server-side failures.
 *
 * Note: `req` is the incoming NextRequest and is used for authentication and body parsing.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const body = await req.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

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
      orderId: `INV-${invoice.number}`,
      customerDetails: {
        name: invoice.recipient.name,
        email: invoice.recipient.email || 'customer@fixzit.co',
        phone: invoice.recipient.phone || '+966500000000',
        address: {
          street: typeof invoice.recipient.address === 'string' ? invoice.recipient.address : 'Saudi Arabia',
          city: 'Riyadh',
          country: 'SA',
          zip: '11564'
        }
      },
      description: `Payment for Invoice ${invoice.number}`,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payments/success`,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/callback`
    };

    const paymentResponse = await createPaymentPage(paymentRequest);

    if ((paymentResponse as any).redirect_url) {
      // Update invoice with payment transaction
      invoice.history.push({
        action: 'PAYMENT_INITIATED',
        performedBy: user.id,
        performedAt: new Date(),
        details: `Payment initiated with transaction ${paymentResponse.tran_ref || 'N/A'}`
      });
      await invoice.save();

      return NextResponse.json({
        success: true,
        paymentUrl: (paymentResponse as any).redirect_url,
        transactionId: (paymentResponse as any).tran_ref
      });
    } else {
      return NextResponse.json({ 
        error: 'Payment initialization failed' 
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Payment creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create payment' 
    }, { status: 500 });
  }
}
