import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import SubscriptionInvoice from '@/server/models/SubscriptionInvoice';
import Subscription from '@/server/models/Subscription';
import PaymentMethod from '@/server/models/PaymentMethod';
import {
  buildPaytabsIdempotencyKey,
  enforcePaytabsPayloadSize,
  extractPaytabsSignature,
  normalizePaytabsCallbackPayload,
  parsePaytabsJsonPayload,
  PaytabsCallbackValidationError,
  PAYTABS_CALLBACK_IDEMPOTENCY_TTL_MS,
  PAYTABS_CALLBACK_RATE_LIMIT,
} from '@/lib/payments/paytabs-callback.contract';
import { verifyPayment, validateCallback } from '@/lib/paytabs';
import { logger } from '@/lib/logger';
import { withIdempotency } from '@/server/security/idempotency';
import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError } from '@/server/utils/errorResponses';
import { createSecureResponse, getClientIP } from '@/server/security/headers';
import { Config } from '@/lib/config/constants';

const PAYTABS_SERVER_KEY = Config.payment.paytabs.serverKey;
const PAYTABS_CONFIGURED = Boolean(PAYTABS_SERVER_KEY && Config.payment.paytabs.profileId);
/**
 * @openapi
 * /api/billing/callback/paytabs:
 *   get:
 *     summary: billing/callback/paytabs operations
 *     tags: [billing]
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
    `${new URL(req.url).pathname}:${clientIp}`,
    PAYTABS_CALLBACK_RATE_LIMIT.requests,
    PAYTABS_CALLBACK_RATE_LIMIT.windowMs
  );
  if (!rl.allowed) {
    return rateLimitError();
  }

  // Read raw body for signature validation
  const rawBody = await req.text();
  try {
    enforcePaytabsPayloadSize(rawBody);
  } catch (_error) {
    if (_error instanceof PaytabsCallbackValidationError) {
      return createSecureResponse({ error: _error.message }, 413, req);
    }
    throw _error;
  }

  let payload: Record<string, unknown>;
  try {
    payload = parsePaytabsJsonPayload(rawBody);
  } catch (_error) {
    if (_error instanceof PaytabsCallbackValidationError) {
      return createSecureResponse({ error: _error.message }, 400, req);
    }
    throw _error;
  }
  
  const signature = extractPaytabsSignature(req, payload);
  if (!signature && PAYTABS_CONFIGURED) {
    logger.error('[Billing Callback] Missing signature from PayTabs');
    return createSecureResponse({ error: 'Invalid signature' }, 401, req);
  }

  if (!signature) {
    logger.warn('[Billing Callback] Signature missing; dev mode fallback', {
      paytabsConfigured: PAYTABS_CONFIGURED,
    });
  }

  // 1) Validate signature
  if (!validateCallback(payload, signature || '')) {
    logger.error('[Billing Callback] Invalid signature from PayTabs');
    return createSecureResponse({ error: 'Invalid signature' }, 401, req);
  }
  
  await connectToDatabase();
  
  let normalized;
  try {
    normalized = normalizePaytabsCallbackPayload(payload);
  } catch (_error) {
    if (_error instanceof PaytabsCallbackValidationError) {
      return createSecureResponse({ error: _error.message }, 400, req);
    }
    throw _error;
  }
  
  const tranRef = normalized.tranRef;
  const cartId = normalized.cartId;
  const token = normalized.token;

  // 2) Verify payment with PayTabs server-to-server
  let verification: unknown = null;
  if (PAYTABS_CONFIGURED) {
    try {
      verification = await verifyPayment(tranRef);
    } catch (_error) {
      const message = _error instanceof Error ? _error.message : String(_error);
      logger.error('[Billing Callback] Failed to verify payment with PayTabs:', message);
      return createSecureResponse({ error: 'Payment verification failed' }, 500, req);
    }
  } else {
    logger.warn('[Billing Callback] Skipping PayTabs verification (dev mode)');
  }
  
  // Type-safe validation of verification result
  function isValidPayTabsVerification(data: unknown): data is {
    payment_result: { response_status: string; response_message?: string };
    cart_amount?: string;
    payment_info?: { card_scheme?: string; payment_description?: string; expiryMonth?: string; expYear?: string };
  } {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return (
      typeof obj.payment_result === 'object' &&
      obj.payment_result !== null &&
      typeof (obj.payment_result as Record<string, unknown>).response_status === 'string'
    );
  }

  let verificationData:
    | {
        payment_result: { response_status: string; response_message?: string };
        cart_amount?: string;
        payment_info?: { card_scheme?: string; payment_description?: string; expiryMonth?: string; expYear?: string };
      }
    | null = null;

  if (PAYTABS_CONFIGURED) {
    if (!isValidPayTabsVerification(verification)) {
      logger.error('[Billing Callback] Invalid verification response structure from PayTabs');
      return createSecureResponse({ error: 'Invalid payment verification response' }, 500, req);
    }
    verificationData = verification;
  } else {
    verificationData = {
      payment_result: {
        response_status: normalized.respStatus,
        response_message: normalized.respMessage,
      },
      cart_amount: normalized.amount?.toString(),
    };
  }

  const verifiedOk = verificationData?.payment_result?.response_status === 'A';
  
  const subId = cartId?.replace('SUB-','');
  const sub = (await Subscription.findById(subId));
  if (!sub) return createSecureResponse({ error: 'SUB_NOT_FOUND' }, 400, req);

  // Find invoice
  // @ts-expect-error - Mongoose 8.x type resolution issue with conditional model export
  const inv = (await SubscriptionInvoice.findOne({ subscriptionId: sub._id, status: 'pending' }));
  if (!inv) return createSecureResponse({ error: 'INV_NOT_FOUND' }, 400, req);

  await withIdempotency(
    buildPaytabsIdempotencyKey(normalized, {
      route: 'billing',
      subscriptionId: String(sub._id),
      invoiceId: String(inv._id),
    }),
    async () => {
      if (!verifiedOk) {
        inv.status = 'failed';
        inv.errorMessage =
          verificationData?.payment_result?.response_message ||
          normalized.respMessage ||
          'Payment declined';
      } else {
        inv.status = 'paid';
        inv.paytabsTranRef = tranRef;
      }

      await inv.save();

      if (verifiedOk && token && sub.billing_cycle === 'MONTHLY') {
        type PaytabsPaymentInfo = {
          card_scheme?: string;
          payment_description?: string;
          expiryMonth?: string;
          expYear?: string;
          customer_email?: string;
        };
        const paymentInfo = verificationData.payment_info as PaytabsPaymentInfo | undefined;
        if (!paymentInfo) {
          logger.warn('[Billing Callback] No payment_info in verification response, skipping token storage');
        } else {
          const paymentMethodPayload: Record<string, unknown> = {
            gateway: 'PAYTABS',
            pt_token: token,
            pt_masked_card: paymentInfo.payment_description,
            pt_customer_email: paymentInfo.customer_email,
          };

          if (sub.subscriber_type === 'OWNER' && sub.owner_user_id) {
            paymentMethodPayload.owner_user_id = sub.owner_user_id;
          } else if (sub.tenant_id) {
            paymentMethodPayload.org_id = sub.tenant_id;
          }

          const pm = await PaymentMethod.create(paymentMethodPayload);
          sub.paytabs_token_id = pm._id;
          await sub.save();
        }
      }
    },
    PAYTABS_CALLBACK_IDEMPOTENCY_TTL_MS
  );

  return createSecureResponse({ ok: verifiedOk }, 200, req);
}
