import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { validateCallback } from '@/lib/paytabs';
import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, validationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

/**
 * @openapi
 * /api/payments/paytabs/callback:
 *   post:
 *     summary: PayTabs payment callback webhook
 *     description: Handles payment gateway callbacks for transaction processing. Validates signature, updates payment status, generates ZATCA-compliant invoices for Saudi Arabia tax compliance.
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tran_ref:
 *                 type: string
 *               cart_id:
 *                 type: string
 *               resp_status:
 *                 type: string
 *               resp_message:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       401:
 *         description: Invalid signature
 *       400:
 *         description: Invalid amount
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIP(req);
    const rl = rateLimit(`payment-callback:${clientIp}`, 30, 60000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    const raw = await req.text();
    const body = JSON.parse(raw);
    const isValid = validateCallback(body, req.headers.get('signature') || '');
    
    if (!isValid) {
      return unauthorizedError('Invalid payment callback signature');
    }

    const { cart_id, resp_status, resp_message, amount } = body;
    const success = resp_status === 'A';
    
    if (success) {
      const total = Number(amount);
      if (!Number.isFinite(total) || total <= 0) {
        return validationError('Invalid payment amount');
      }

      // ZATCA/Fatoora Clearance Flow for Saudi Arabia tax compliance (Phase 2)
      // NOTE: Verify taxpayer's Phase 2 wave assignment and compliance deadlines before deployment
      // Phase 2 waves: https://zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/Pages/default.aspx
      try {
        // Build invoice payload for Fatoora clearance
        const invoicePayload = {
          invoiceType: 'SIMPLIFIED', // B2C transaction
          invoiceNumber: `PAY-${cart_id}`,
          issueDate: new Date().toISOString(),
          seller: {
            name: process.env.ZATCA_SELLER_NAME || 'Fixzit Enterprise',
            vatNumber: process.env.ZATCA_VAT_NUMBER || '300123456789012',
            address: process.env.ZATCA_SELLER_ADDRESS || 'Saudi Arabia'
          },
          total: String(total),
          vatAmount: String(+(total * 0.15).toFixed(2)),
          items: [{
            description: 'Payment via PayTabs',
            quantity: 1,
            unitPrice: total,
            vatRate: 0.15
          }]
        };

        // Submit invoice to ZATCA/Fatoora for synchronous Phase-2 clearance
        // Call official ZATCA clearance API with full invoice payload
        const clearanceApiUrl = process.env.ZATCA_CLEARANCE_API_URL || 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core/invoices/clearance/single';
        const clearanceApiKey = process.env.ZATCA_API_KEY;
        
        if (!clearanceApiKey) {
          throw new Error('ZATCA API key not configured - cannot proceed with clearance');
        }

        // Call Phase-2 clearance API with retry logic
        let clearanceResponse: {
          clearanceStatus?: string;
          clearanceId?: string;
          uuid?: string;
          qrCode?: string;
          invoiceHash?: string;
        } | null = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount <= maxRetries) {
          try {
            const response = await fetch(clearanceApiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${clearanceApiKey}`,
                'Accept': 'application/json'
              },
              body: JSON.stringify(invoicePayload)
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(`ZATCA clearance API returned ${response.status}: ${JSON.stringify(errorData)}`);
            }

            clearanceResponse = await response.json();
            break; // Success - exit retry loop
          } catch (fetchError) {
            retryCount++;
            if (retryCount > maxRetries) {
              throw new Error(`ZATCA clearance failed after ${maxRetries} retries: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
            }
            // Exponential backoff: 1s, 2s, 4s
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
          }
        }
        
        // Validate clearance response schema
        if (!clearanceResponse || typeof clearanceResponse !== 'object') {
          throw new Error('Invalid ZATCA clearance response structure');
        }
        
        if (!clearanceResponse.clearanceStatus || clearanceResponse.clearanceStatus !== 'CLEARED') {
          throw new Error(`ZATCA clearance not approved: ${clearanceResponse.clearanceStatus || 'UNKNOWN'}`);
        }
        
        const clearanceId = clearanceResponse.clearanceId || clearanceResponse.uuid;
        const zatcaQR = clearanceResponse.qrCode;
        const invoiceHash = clearanceResponse.invoiceHash;
        
        if (!clearanceId || !zatcaQR) {
          throw new Error('ZATCA clearance response missing required fields (clearanceId or qrCode)');
        }

        // Persist ZATCA evidence to payment record with proper audit trail
        try {
          await updatePaymentRecord(cart_id, {
            zatcaQR,
            zatcaInvoiceHash: invoiceHash,
            fatooraClearanceId: clearanceId,
            fatooraClearedAt: new Date(),
            zatcaSubmittedAt: new Date(),
            invoicePayload,
            complianceStatus: 'CLEARED'
          });
        } catch (dbError) {
          logger.error('[ZATCA] Failed to persist clearance evidence', {
            cartId: String(cart_id).slice(0, 8) + '...',
            error: dbError instanceof Error ? dbError.message : String(dbError)
          });
          // Abort payment flow if we cannot persist compliance evidence
          throw new Error(`Payment cleared by ZATCA but failed to persist evidence: ${dbError instanceof Error ? dbError.message : 'Database error'}`);
        }
        
        logger.info('[ZATCA] Fatoora clearance successful', {
          cartId: String(cart_id).slice(0, 8) + '...',
          clearanceId: clearanceId ? String(clearanceId).slice(0, 16) + '...' : 'N/A'
        });

// Helper function to update payment record with ZATCA evidence
async function updatePaymentRecord(
  cartId: string,
  evidence: {
    zatcaQR: string;
    zatcaInvoiceHash?: string;
    fatooraClearanceId: string;
    fatooraClearedAt: Date;
    zatcaSubmittedAt: Date;
    invoicePayload: Record<string, unknown>;
    complianceStatus: string;
  }
) {
  // Import payment model dynamically to avoid circular dependencies
  const { AqarPayment } = await import('@/models/aqar');
  
  const result = await AqarPayment.findOneAndUpdate(
    { _id: cartId },
    {
      $set: {
        'zatca.qrCode': evidence.zatcaQR,
        'zatca.invoiceHash': evidence.zatcaInvoiceHash,
        'zatca.clearanceId': evidence.fatooraClearanceId,
        'zatca.clearedAt': evidence.fatooraClearedAt,
        'zatca.submittedAt': evidence.zatcaSubmittedAt,
        'zatca.invoicePayload': evidence.invoicePayload,
        'zatca.complianceStatus': evidence.complianceStatus,
        updatedAt: new Date()
      }
    },
    { 
      new: true,
      upsert: false, // Don't create if not exists - payment must exist
      runValidators: true
    }
  );
  
  if (!result) {
    throw new Error(`Payment record not found for cart_id: ${cartId}`);
  }
  
  return result;
}
      } catch (zatcaError) {
        // Log detailed Fatoora error
        logger.error('[ZATCA] Fatoora clearance FAILED - Payment aborted', {
          cartId: String(cart_id).slice(0, 8) + '...',
          error: zatcaError instanceof Error ? zatcaError.message : String(zatcaError),
          stack: zatcaError instanceof Error ? zatcaError.stack : undefined
        });
        
        // Propagate error to abort payment processing - non-compliant invoices cannot be marked successful
        return NextResponse.json({
          ok: false,
          status: 'ZATCA_CLEARANCE_FAILED',
          message: 'Payment received but ZATCA/Fatoora clearance failed. Invoice non-compliant.',
          error: zatcaError instanceof Error ? zatcaError.message : 'Unknown clearance error'
        }, { status: 500 });
      }
      
      logger.info('Payment successful', { order: String(cart_id).slice(0,8) + '...' });
      
      // Activate AqarPackage if cart_id refers to an AqarPayment
      try {
        const { activatePackageAfterPayment } = await import('@/lib/aqar/package-activation');
        await activatePackageAfterPayment(String(cart_id));
      } catch (err) {
        logger.warn('Package activation skipped or failed', { 
          cart_id: String(cart_id).slice(0,8) + '...', 
          error: err instanceof Error ? err.message : String(err)
        });
        // Don't fail the payment callback if package activation fails
      }
    }
    
    return createSecureResponse({
      ok: true,
      status: success ? 'PAID' : 'FAILED',
      message: resp_message
    }, 200, req);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
