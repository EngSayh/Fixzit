import { NextRequest} from 'next/server';
import { verifyPayment, validateCallback } from '@/lib/paytabs';
import { parseCartAmount } from '@/lib/payments/parseCartAmount';
import { Invoice } from '@/server/models/Invoice';
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Types } from 'mongoose';

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

import { logger } from '@/lib/logger';

type PayTabsCallbackPayload = {
  tran_ref?: string;
  tranRef?: string;
  cart_id?: string;
  cartId?: string;
  invoice_id?: string;
  order_id?: string;
  cart_amount?: string | number;
  cartAmount?: string | number;
  amount?: string | number;
  payment_result?: { response_status?: string; response_message?: string };
  paymentResult?: { response_status?: string; response_message?: string };
  payment_info?: { payment_method?: string; card_scheme?: string };
  paymentInfo?: { payment_method?: string; card_scheme?: string };
  payment_method?: string;
  respStatus?: string;
  respMessage?: string;
};

// SECURITY: Explicitly check both env vars are non-empty strings (not just truthy)
const PAYTABS_CONFIGURED = 
  typeof process.env.PAYTABS_PROFILE_ID === 'string' && 
  process.env.PAYTABS_PROFILE_ID.trim() !== '' &&
  typeof process.env.PAYTABS_SERVER_KEY === 'string' && 
  process.env.PAYTABS_SERVER_KEY.trim() !== '';
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
    const signatureHeader = req.headers.get('x-paytabs-signature') || req.headers.get('signature') || '';
    const parsed = JSON.parse(raw) as PayTabsCallbackPayload;

    // SECURITY: Always require signature unless explicit test override
    const ALLOW_INSECURE = 
      process.env.PAYTABS_ALLOW_INSECURE_CALLBACKS === 'true' && 
      (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test');
    
    if (!signatureHeader) {
      if (ALLOW_INSECURE) {
        logger.warn('⚠️  INSECURE: Accepting callback without signature (test/dev override enabled)');
      } else {
        logger.error('Missing PayTabs signature - rejecting callback');
        return createSecureResponse({ error: 'Missing signature' }, 401, req);
      }
    } else if (!PAYTABS_CONFIGURED) {
      if (ALLOW_INSECURE) {
        logger.warn('⚠️  INSECURE: Accepting callback without validation (credentials not configured, test/dev override enabled)');
      } else {
        logger.error('PayTabs not configured - cannot validate signature');
        return createSecureResponse({ error: 'Payment gateway not configured' }, 503, req);
      }
    } else if (!validateCallback(parsed as Record<string, unknown>, signatureHeader)) {
      logger.error('Invalid PayTabs signature');
      return createSecureResponse({ error: 'Invalid signature' }, 401, req);
    }

    const tran_ref =
      parsed.tran_ref ||
      parsed.tranRef;
    const cart_id =
      parsed.cart_id ||
      parsed.cartId ||
      parsed.invoice_id ||
      parsed.order_id;
    const rawAmount = parsed.cart_amount ?? parsed.cartAmount ?? parsed.amount;
    const payment_result =
      parsed.payment_result ||
      parsed.paymentResult ||
      ((parsed.respStatus || parsed.respMessage)
        ? { response_status: parsed.respStatus, response_message: parsed.respMessage }
        : undefined);
    const payment_info =
      parsed.payment_info ||
      parsed.paymentInfo ||
      (parsed.payment_method ? { payment_method: parsed.payment_method } : undefined);

    // Validate required fields
    if (!tran_ref) {
      return createSecureResponse({ error: 'Missing transaction reference' }, 400, req);
    }

    // Verify payment with PayTabs
    // SECURITY: Fail closed - reject callback if credentials not configured
    let verification: { payment_result?: { response_status?: string } } | null = null;
    if (PAYTABS_CONFIGURED) {
      try {
        const result = await verifyPayment(tran_ref);
        verification = result as { payment_result?: { response_status?: string } };
      } catch (verificationError: unknown) {
        logger.error('PayTabs verification failed', {
          tran_ref,
          error: verificationError instanceof Error ? verificationError.message : verificationError,
        });
        return createSecureResponse({
          error: 'Payment verification failed',
        }, 500, req);
      }
    } else {
      // TEST_MODE allows bypass, otherwise reject
      const TEST_MODE = process.env.PAYTABS_TEST_MODE === 'true';
      if (!TEST_MODE) {
        logger.error('PayTabs credentials not configured - rejecting callback (production safety)');
        return createSecureResponse({
          error: 'Payment gateway not configured',
        }, 503, req);
      }
      logger.warn('PayTabs credentials not configured - TEST_MODE allows bypass');
    }

    await connectToDatabase();
    
    // Parse and validate amount early (needed for orphaned payment storage)
    const amount = parseCartAmount(rawAmount, Number.NaN);
    if (!Number.isFinite(amount) || amount < 0) {
      return createSecureResponse({ error: 'Invalid cart amount' }, 400, req);
    }
    
    let invoice = null;
    if (cart_id && Types.ObjectId.isValid(cart_id)) {
      invoice = await Invoice.findById(cart_id);
    } else if (cart_id) {
      logger.warn('Ignoring non ObjectId cart_id from PayTabs callback', { cart_id });
    }

    if (!invoice) {
      logger.error('Invoice not found for payment callback - persisting as orphaned payment', { cart_id, tran_ref });
      
      // Persist orphaned payment for manual reconciliation
      try {
        const mongoose = await import('mongoose');
        const db = mongoose.connection.db;
        if (!db) {
          throw new Error('Database connection not established');
        }
        
        await db.collection('orphaned_payments').insertOne({
          cart_id,
          tran_ref,
          amount,
          payment_result,
          payment_info,
          receivedAt: new Date(),
          rawPayload: parsed,
          reconciled: false,
          createdAt: new Date(),
        });
        
        return createSecureResponse({
          success: true,
          message: 'Payment stored for manual reconciliation - invoice not found',
        }, 200, req);
      } catch (orphanedError) {
        logger.error('Failed to persist orphaned payment', {
          error: orphanedError instanceof Error ? orphanedError.message : String(orphanedError),
          cart_id,
          tran_ref,
        });
        return createSecureResponse({
          error: 'Payment processing failed - could not persist for reconciliation',
        }, 500, req);
      }
    }

    // Update invoice based on payment result
    // SECURITY: Fail closed - require explicit approval unless TEST_MODE is enabled
    const TEST_MODE = process.env.PAYTABS_TEST_MODE === 'true';
    const callbackStatus = payment_result?.response_status?.toUpperCase();
    const verificationStatus = verification?.payment_result?.response_status?.toUpperCase();
    const callbackApproved = callbackStatus === 'A' || callbackStatus === 'APPROVED';
    // Require explicit verification approval OR explicit test mode bypass
    const verificationApproved = TEST_MODE 
      ? true  // TEST_MODE: explicitly allow bypass (documented)
      : (verificationStatus === 'A' || verificationStatus === 'APPROVED');

    if (callbackApproved && verificationApproved) {
      // Payment successful
      invoice.status = 'PAID';
      invoice.payments.push({
        date: new Date(),
        amount,
        method: payment_info?.payment_method ?? 'UNKNOWN',
        reference: tran_ref,
        status: 'COMPLETED',
        transactionId: tran_ref,
        notes: `Payment via ${payment_info?.card_scheme || payment_info?.payment_method || 'PayTabs'}`
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
          
          // Enqueue background retry job
          const { enqueueActivationRetry } = await import('@/jobs/package-activation-queue');
          await enqueueActivationRetry(invoice.metadata.aqarPaymentId, String(invoice._id));
        }
      }
    } else {
      // Payment failed
      invoice.payments.push({
        date: new Date(),
        amount,
        method: payment_info?.payment_method || 'UNKNOWN',
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
