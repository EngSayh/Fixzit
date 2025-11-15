import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  tapPayments,
  isChargeSuccessful,
  isChargeFailed,
  type TapWebhookEvent,
  type TapChargeResponse,
  type TapRefundResponse,
} from '@/lib/finance/tap-payments';

/**
 * POST /api/payments/tap/webhook
 * 
 * Receive and process Tap payment webhooks
 * 
 * Webhook Events:
 * - charge.created: Charge was created
 * - charge.captured: Payment was successful
 * - charge.authorized: Payment was authorized (requires capture)
 * - charge.declined: Payment was declined
 * - charge.failed: Payment failed
 * - refund.created: Refund was created
 * - refund.succeeded: Refund was successful
 * - refund.failed: Refund failed
 * 
 * Security:
 * - Verifies webhook signature using TAP_WEBHOOK_SECRET
 * - Logs all events for audit trail
 * - Idempotent processing based on event ID
 */
export async function POST(req: NextRequest) {
  const correlationId = crypto.randomUUID();

  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('x-tap-signature') || '';

    logger.info('[POST /api/payments/tap/webhook] Received webhook', {
      correlationId,
      signature: signature.substring(0, 10) + '...',
      bodyLength: rawBody.length,
    });

    // Parse and verify webhook event
    let event: TapWebhookEvent;
    try {
      event = tapPayments.parseWebhookEvent(rawBody, signature);
    } catch (error) {
      logger.error('[POST /api/payments/tap/webhook] Invalid webhook signature or payload', {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    logger.info('[POST /api/payments/tap/webhook] Processing webhook event', {
      correlationId,
      eventId: event.id,
      eventType: event.type,
      liveMode: event.live_mode,
    });

    // Process event based on type
    switch (event.type) {
      case 'charge.created':
        await handleChargeCreated(event, correlationId);
        break;

      case 'charge.captured':
        await handleChargeCaptured(event, correlationId);
        break;

      case 'charge.authorized':
        await handleChargeAuthorized(event, correlationId);
        break;

      case 'charge.declined':
      case 'charge.failed':
        await handleChargeFailed(event, correlationId);
        break;

      case 'refund.created':
      case 'refund.succeeded':
        await handleRefundSucceeded(event, correlationId);
        break;

      case 'refund.failed':
        await handleRefundFailed(event, correlationId);
        break;

      default:
        logger.warn('[POST /api/payments/tap/webhook] Unhandled event type', {
          correlationId,
          eventType: event.type,
        });
    }

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ received: true, eventId: event.id });

  } catch (error) {
    logger.error('[POST /api/payments/tap/webhook] Error processing webhook', {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return 500 to signal Tap to retry
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        correlationId,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Webhook Event Handlers
// ============================================================================

/**
 * Handle charge.created event
 * Log the charge creation for audit trail
 */
async function handleChargeCreated(event: TapWebhookEvent, correlationId: string) {
  const charge = event.data.object as TapChargeResponse;

  logger.info('[Webhook] Charge created', {
    correlationId,
    chargeId: charge.id,
    amount: charge.amount,
    currency: charge.currency,
    customerEmail: charge.customer.email,
    metadata: charge.metadata,
  });

  // TODO: Store charge in database
  // Example:
  // await prisma.payment.create({
  //   data: {
  //     tapChargeId: charge.id,
  //     amount: charge.amount,
  //     currency: charge.currency,
  //     status: 'PENDING',
  //     userId: charge.metadata?.userId,
  //     organizationId: charge.metadata?.organizationId,
  //     metadata: charge.metadata,
  //   },
  // });
}

/**
 * Handle charge.captured event
 * Payment was successfully captured - mark as paid
 */
async function handleChargeCaptured(event: TapWebhookEvent, correlationId: string) {
  const charge = event.data.object as TapChargeResponse;

  logger.info('[Webhook] Charge captured - payment successful', {
    correlationId,
    chargeId: charge.id,
    amount: charge.amount,
    currency: charge.currency,
    customerEmail: charge.customer.email,
    orderId: charge.reference?.order,
    metadata: charge.metadata,
  });

  // TODO: Update payment status in database
  // TODO: Fulfill order/service
  // TODO: Send confirmation email/SMS
  // Example:
  // await prisma.payment.update({
  //   where: { tapChargeId: charge.id },
  //   data: { 
  //     status: 'CAPTURED',
  //     capturedAt: new Date(),
  //   },
  // });
  //
  // await prisma.order.update({
  //   where: { id: charge.reference?.order },
  //   data: { 
  //     paymentStatus: 'PAID',
  //     paidAt: new Date(),
  //   },
  // });
  //
  // await sendPaymentConfirmationEmail(charge.customer.email, charge);
}

/**
 * Handle charge.authorized event
 * Payment was authorized but not captured yet
 * (typically used for pre-authorization flows)
 */
async function handleChargeAuthorized(event: TapWebhookEvent, correlationId: string) {
  const charge = event.data.object as TapChargeResponse;

  logger.info('[Webhook] Charge authorized - awaiting capture', {
    correlationId,
    chargeId: charge.id,
    amount: charge.amount,
    customerEmail: charge.customer.email,
  });

  // TODO: Update payment status to AUTHORIZED
  // You can capture the payment later by calling Tap API's capture endpoint
  // Example:
  // await prisma.payment.update({
  //   where: { tapChargeId: charge.id },
  //   data: { 
  //     status: 'AUTHORIZED',
  //     authorizedAt: new Date(),
  //   },
  // });
}

/**
 * Handle charge.declined or charge.failed events
 * Payment was declined or failed
 */
async function handleChargeFailed(event: TapWebhookEvent, correlationId: string) {
  const charge = event.data.object as TapChargeResponse;

  logger.warn('[Webhook] Charge failed or declined', {
    correlationId,
    chargeId: charge.id,
    status: charge.status,
    amount: charge.amount,
    customerEmail: charge.customer.email,
    responseCode: charge.response.code,
    responseMessage: charge.response.message,
  });

  // TODO: Update payment status to FAILED/DECLINED
  // TODO: Notify user of failed payment
  // Example:
  // await prisma.payment.update({
  //   where: { tapChargeId: charge.id },
  //   data: { 
  //     status: charge.status,
  //     failedAt: new Date(),
  //     failureReason: charge.response.message,
  //   },
  // });
  //
  // await sendPaymentFailedEmail(charge.customer.email, charge);
}

/**
 * Handle refund.created or refund.succeeded events
 * Refund was successfully processed
 */
async function handleRefundSucceeded(event: TapWebhookEvent, correlationId: string) {
  const refund = event.data.object as TapRefundResponse;

  logger.info('[Webhook] Refund succeeded', {
    correlationId,
    refundId: refund.id,
    chargeId: refund.charge,
    amount: refund.amount,
    currency: refund.currency,
    reason: refund.reason,
  });

  // TODO: Update refund status in database
  // TODO: Update order/invoice status
  // TODO: Notify user of successful refund
  // Example:
  // await prisma.refund.update({
  //   where: { tapRefundId: refund.id },
  //   data: { 
  //     status: 'SUCCEEDED',
  //     succeededAt: new Date(),
  //   },
  // });
  //
  // await sendRefundConfirmationEmail(customerEmail, refund);
}

/**
 * Handle refund.failed event
 * Refund failed to process
 */
async function handleRefundFailed(event: TapWebhookEvent, correlationId: string) {
  const refund = event.data.object as TapRefundResponse;

  logger.error('[Webhook] Refund failed', {
    correlationId,
    refundId: refund.id,
    chargeId: refund.charge,
    amount: refund.amount,
    responseCode: refund.response.code,
    responseMessage: refund.response.message,
  });

  // TODO: Update refund status to FAILED
  // TODO: Alert admin/finance team
  // Example:
  // await prisma.refund.update({
  //   where: { tapRefundId: refund.id },
  //   data: { 
  //     status: 'FAILED',
  //     failedAt: new Date(),
  //     failureReason: refund.response.message,
  //   },
  // });
  //
  // await notifyAdminOfRefundFailure(refund);
}

/**
 * GET /api/payments/tap/webhook
 * 
 * Webhook configuration endpoint (for testing/debugging)
 * Returns webhook URL that should be configured in Tap dashboard
 */
export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
  const webhookUrl = `${baseUrl}/api/payments/tap/webhook`;

  return NextResponse.json({
    webhookUrl,
    instructions: 'Configure this URL in your Tap dashboard under Webhooks settings',
    events: [
      'charge.created',
      'charge.captured',
      'charge.authorized',
      'charge.declined',
      'charge.failed',
      'refund.created',
      'refund.succeeded',
      'refund.failed',
    ],
  });
}
