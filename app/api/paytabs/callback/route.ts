import { NextRequest } from 'next/server';
import { dbConnect } from '@/db/mongoose';
import { finalizePayTabsTransaction, normalizePayTabsPayload } from '@/lib/finance/paytabs';
import { validateCallback } from '@/lib/paytabs';
import {
  buildPaytabsIdempotencyKey,
  enforcePaytabsPayloadSize,
  extractPaytabsSignature,
  parsePaytabsJsonPayload,
  PaytabsCallbackValidationError,
  PAYTABS_CALLBACK_IDEMPOTENCY_TTL_MS,
  PAYTABS_CALLBACK_RATE_LIMIT,
} from '@/lib/payments/paytabs-callback.contract';
import { logger } from '@/lib/logger';
import { withIdempotency } from '@/server/security/idempotency';
import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse, getClientIP } from '@/server/security/headers';
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
  const rl = rateLimit(
    `paytabs:subscription:${clientIp}`,
    PAYTABS_CALLBACK_RATE_LIMIT.requests,
    PAYTABS_CALLBACK_RATE_LIMIT.windowMs
  );
  if (!rl.allowed) {
    return rateLimitError();
  }

  const rawBody = await req.text();
  try {
    enforcePaytabsPayloadSize(rawBody);
  } catch (error) {
    if (error instanceof PaytabsCallbackValidationError) {
      return createSecureResponse({ error: error.message }, 413, req);
    }
    throw error;
  }

  try {
    const payload = parsePaytabsJsonPayload(rawBody);

    const signature = extractPaytabsSignature(req, payload);
    if (!signature) {
      logger.error('PayTabs callback rejected: Missing signature');
      return createSecureResponse(
        { error: 'Payment verification failed: Missing signature' },
        400,
        req
      );
    }

    // Validate the signature using HMAC-SHA256
    const isValid = validateCallback(payload, signature);
    if (!isValid) {
      logger.error('PayTabs callback rejected: Invalid signature', {
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
    
    await dbConnect();

    let normalized;
    try {
      normalized = normalizePayTabsPayload(payload);
    } catch (error) {
      if (error instanceof PaytabsCallbackValidationError) {
        logger.error('PayTabs callback rejected: Invalid payload shape', { message: error.message });
        return createSecureResponse({ error: error.message }, 400, req);
      }
      throw error;
    }

    try {
      const result = await withIdempotency(
        buildPaytabsIdempotencyKey(normalized, { route: 'subscription' }),
        () => finalizePayTabsTransaction(normalized),
        PAYTABS_CALLBACK_IDEMPOTENCY_TTL_MS
      );
      return createSecureResponse(result, 200, req);
    } catch (error: unknown) {
      return handleApiError(error);
    }
  } catch (error) {
    if (error instanceof PaytabsCallbackValidationError) {
      logger.error('PayTabs callback rejected: Invalid JSON payload');
      const errorMessage = `Payment verification failed: ${error.message}`;
      return createSecureResponse(
        { error: errorMessage },
        /exceeds limit/.test(error.message) ? 413 : 400,
        req
      );
    }
    throw error;
  }
}
