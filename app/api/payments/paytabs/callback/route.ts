import { NextRequest, NextResponse } from 'next/server';
import { generateZATCAQR } from '@/lib/zatca';
import { validateCallback } from '@/lib/paytabs';
import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, validationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

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
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = rateLimit(`payment-callback:${clientIp}`, 30, 60);
    if (!rl.allowed) {
      return rateLimitError();
    }

    const raw = await req.text();
    const body = JSON.parse(raw);
    const isValid = validateCallback(body, req.headers.get('signature') || '');
    
    if (!isValid) {
      return unauthorizedError('Invalid payment callback signature');
    }

    const { tran_ref, cart_id, resp_status, resp_message, amount } = body;
    const success = resp_status === 'A';
    
    if (success) {
      const total = Number(amount);
      if (!Number.isFinite(total) || total <= 0) {
        return validationError('Invalid payment amount');
      }

      const zatcaQR = await generateZATCAQR({
        sellerName: 'Fixzit Enterprise',
        vatNumber: '300123456789012',
        timestamp: new Date().toISOString(),
        total: String(total),
        vatAmount: String(+(total * 0.15).toFixed(2))
      });
      
      console.log('Payment successful', { order: String(cart_id).slice(0,8) + '...' });
    }
    
    return createSecureResponse({
      ok: true,
      status: success ? 'PAID' : 'FAILED',
      message: resp_message
    }, 200, req);
  } catch (error: any) {
    return handleApiError(error);
  }
}
