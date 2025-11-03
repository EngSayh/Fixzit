import { NextRequest} from 'next/server';
import { dbConnect } from '@/db/mongoose';
import { finalizePayTabsTransaction, normalizePayTabsPayload } from '@/services/paytabs';
import { validateCallback } from '@/lib/paytabs';

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError, handleApiError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

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
  // Extract signature from payload.
  // According to PayTabs API documentation (https://docs.paytabs.com/payment-callback), 
  // the callback signature is sent in the payload body as 'signature' field.
  // Fallback fields 'sign' and 'payment_signature' are included for:
  // - Backward compatibility with older PayTabs API versions
  // - Different regional PayTabs implementations that may use alternate field names
  // 
  // SECURITY NOTE: Extracting signature from payload body (not headers) is the CORRECT approach.
  // This is the standard webhook signature pattern used by Stripe, GitHub, and PayTabs:
  // 1. PayTabs computes HMAC-SHA256(payload_fields_except_signature, server_key) = signature
  // 2. PayTabs sends payload + signature together in request body
  // 3. We recompute HMAC-SHA256(payload_fields_except_signature, our_server_key)
  // 4. We compare: if computed signature === received signature, payload is authentic
  // 5. Attacker CANNOT forge signature without knowing the secret server_key
  // See lib/paytabs.ts:generateSignature() which excludes 'signature' field from HMAC computation.
  const signature = payload.signature || payload.sign || payload.payment_signature;
  
  if (!signature) {
    console.error('PayTabs callback rejected: Missing signature');
    return createSecureResponse(
      { error: 'Payment verification failed: Missing signature' },
      400,
      req
    );
  }
  
  // Validate the signature using HMAC-SHA256 (constant-time comparison)
  const isValid = validateCallback(payload, signature);
  
  if (!isValid) {
    console.error('PayTabs callback rejected: Invalid signature', {
      cart_id: payload.cart_id,
      tran_ref: payload.tran_ref,
      timestamp: new Date().toISOString()
    });
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

