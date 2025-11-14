import { NextRequest} from 'next/server';
import { verifyPayment, validateCallback } from '@/lib/paytabs';
import { parseCartAmount } from '@/lib/payments/parseCartAmount';
import { Invoice } from '@/server/models/Invoice';
import { connectToDatabase } from "@/lib/mongodb-unified";

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

import { logger } from '@/lib/logger';
/**
 * @openapi
 * /api/payments/callback:
 *   get:
 *     summary: payments/callback operations
 *     tags: [payments]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 10, 300000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    const raw = await req.text();
    const signature = req.headers.get('signature') || '';
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!validateCallback(parsed, signature)) {
      return createSecureResponse({ error: 'Invalid signature' }, 401, req);
    }
    const body = parsed as {
      tran_ref?: string;
      cart_id?: string;
      cart_amount?: string;
      payment_result?: { response_status?: string; response_message?: string };
      payment_info?: { payment_method?: string; card_scheme?: string };
    };

    const { tran_ref, cart_id, payment_result } = body;

    // Validate required fields
    if (!tran_ref) {
      return createSecureResponse({ error: 'Missing transaction reference' }, 400, req);
    }

    // Verify payment with PayTabs
    const verification = await verifyPayment(tran_ref) as { payment_result?: { response_status?: string } } | null;

    await connectToDatabase();
    const invoice = (await Invoice.findById(cart_id)) as any;

    if (!invoice) {
      logger.error('Invoice not found for payment callback:', { cart_id });
      return createSecureResponse({ error: 'Invoice not found' }, 404, req);
    }

    // Validate amount once
    const amount = parseCartAmount(body.cart_amount, Number.NaN);
    if (!Number.isFinite(amount) || amount < 0) {
      return createSecureResponse({ error: 'Invalid cart amount' }, 400, req);
    }
    // Update invoice based on payment result
    if (payment_result?.response_status === 'A' && verification?.payment_result?.response_status === 'A') {
      // Payment successful
      invoice.status = 'PAID';
      invoice.payments.push({
        date: new Date(),
        amount,
        method: body.payment_info?.payment_method ?? 'UNKNOWN',
        reference: tran_ref,
        status: 'COMPLETED',
        transactionId: tran_ref,
        notes: `Payment via ${body.payment_info?.card_scheme || body.payment_info?.payment_method || 'PayTabs'}`
      });

      invoice.history.push({
        action: 'PAID',
        performedBy: 'SYSTEM',
        performedAt: new Date(),
        details: `Payment completed via PayTabs. Transaction: ${tran_ref}`
      });
      
      // Activate AqarPackage if this payment is for a package purchase
      if (invoice.metadata?.aqarPaymentId) {
        // Track activation attempt on invoice
        invoice.metadata.activationAttempted = true;
        invoice.metadata.activationStatus = 'pending';
        await invoice.save();
        
        try {
          const { activatePackageAfterPayment } = await import('@/lib/aqar/package-activation');
          await activatePackageAfterPayment(invoice.metadata.aqarPaymentId);
          
          invoice.metadata.activationStatus = 'completed';
          await invoice.save();
          logger.info('Package activated after payment', { paymentId: invoice.metadata.aqarPaymentId });
        } catch (err) {
          // Record failure and enqueue retry
          invoice.metadata.activationStatus = 'failed';
          invoice.metadata.lastActivationError = err instanceof Error ? err.message : String(err);
          await invoice.save();
          
          logger.error('Failed to activate package after payment - will retry', { 
            paymentId: invoice.metadata.aqarPaymentId, 
            error: err,
            invoiceId: invoice._id 
          });
          
          // Enqueue background retry job (TODO: implement retry queue)
          // await enqueueActivationRetry(invoice.metadata.aqarPaymentId, invoice._id);
        }
      }
    } else {
      // Payment failed
      invoice.payments.push({
        date: new Date(),
        amount,
        method: body.payment_info?.payment_method || 'UNKNOWN',
        reference: tran_ref,
        status: 'FAILED',
        transactionId: tran_ref,
        notes: payment_result?.response_message || 'Payment failed'
      });

      invoice.history.push({
        action: 'PAYMENT_FAILED',
        performedBy: 'SYSTEM',
        performedAt: new Date(),
        details: `Payment failed: ${payment_result?.response_message || 'Unknown error'}. Transaction: ${tran_ref}`
      });
    }

    await invoice.save();

    return createSecureResponse({ success: true }, 200, req);
  } catch (error: unknown) {
    logger.error('Payment callback error:', error instanceof Error ? error.message : 'Unknown error');
    return createSecureResponse({ 
      error: 'Failed to process payment callback' 
    }, 500, req);
  }
}


