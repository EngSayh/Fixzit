import { NextRequest} from 'next/server';
import { dbConnect } from '@/db/mongoose';
import { finalizePayTabsTransaction, normalizePayTabsPayload } from '@/services/paytabs';
import { validateCallback } from '@/lib/paytabs';

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError, handleApiError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';
import { logError } from '@/lib/logger';

/**
 * @openapi
 * /api/paytabs/callback:
 *   get:
 *     summary: paytabs/callback operations
 *     tags: [paytabs]
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
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  await dbConnect();
  const payload = await req.json();
  
  // 🔒 SECURITY FIX (PR #42/#45/#47/#53/#77): Validate PayTabs signature
  // Extract signature from payload (PayTabs sends it as 'signature' field)
  const signature = payload.signature || payload.sign || payload.payment_signature;
  
  if (!signature) {
    logError('PayTabs callback rejected: Missing signature', null);
    return createSecureResponse(
      { error: 'Payment verification failed: Missing signature' },
      400,
      req
    );
  }
  
  // Validate the signature using HMAC-SHA256
  const isValid = validateCallback(payload, signature);
  
  if (!isValid) {
    logError(
      'PayTabs callback rejected: Invalid signature',
      new Error('Signature validation failed'),
      {
        component: 'PayTabsCallbackAPI',
        cart_id: payload.cart_id,
        tran_ref: payload.tran_ref,
        timestamp: new Date().toISOString()
      }
    );
    return createSecureResponse(
      { error: 'Payment verification failed: Invalid signature' },
      403,
      req
    );
  }
  
  // ✅ Signature validated - proceed with transaction finalization
  const normalized = normalizePayTabsPayload(payload);

  try {
    const result = await finalizePayTabsTransaction(normalized);
    return createSecureResponse(result, 200, req);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

