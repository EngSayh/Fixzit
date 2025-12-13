/**
 * @fileoverview Tap Payments webhook event handlers
 * @description Processes charge and refund events from Tap webhooks
 * @module lib/finance/tap-webhook/handlers
 */

import { logger } from "@/lib/logger";
import {
  type TapWebhookEvent,
  type TapChargeResponse,
  type TapRefundResponse,
} from "@/lib/finance/tap-payments";
import {
  upsertTransactionFromCharge,
  ensurePaymentForCharge,
  markInvoicePaymentStatus,
  updateRefundRecord,
} from "./persistence";

/**
 * Handle charge.created event
 * Log the charge creation for audit trail
 */
export async function handleChargeCreated(
  event: TapWebhookEvent,
  correlationId: string,
): Promise<void> {
  const charge = event.data.object as TapChargeResponse;

  logger.info("[Webhook] Charge created", {
    correlationId,
    chargeId: charge.id,
    amount: charge.amount,
    currency: charge.currency,
    customerEmail: charge.customer.email,
    metadata: charge.metadata,
  });

  await upsertTransactionFromCharge(event.type, charge, correlationId, {
    responseCode: charge.response?.code,
    responseMessage: charge.response?.message,
  });
}

/**
 * Handle charge.captured event
 * Payment was successfully captured - mark as paid
 */
export async function handleChargeCaptured(
  event: TapWebhookEvent,
  correlationId: string,
): Promise<void> {
  const charge = event.data.object as TapChargeResponse;

  logger.info("[Webhook] Charge captured - payment successful", {
    correlationId,
    chargeId: charge.id,
    amount: charge.amount,
    currency: charge.currency,
    customerEmail: charge.customer.email,
    orderId: charge.reference?.order,
    metadata: charge.metadata,
  });

  const transaction = await upsertTransactionFromCharge(
    event.type,
    charge,
    correlationId,
    {
      responseCode: charge.response?.code,
      responseMessage: charge.response?.message,
    },
  );
  if (transaction) {
    await ensurePaymentForCharge(transaction, charge, correlationId);
  }
}

/**
 * Handle charge.authorized event
 * Payment was authorized but not captured yet
 * (typically used for pre-authorization flows)
 */
export async function handleChargeAuthorized(
  event: TapWebhookEvent,
  correlationId: string,
): Promise<void> {
  const charge = event.data.object as TapChargeResponse;

  logger.info("[Webhook] Charge authorized - awaiting capture", {
    correlationId,
    chargeId: charge.id,
    amount: charge.amount,
    customerEmail: charge.customer.email,
  });

  await upsertTransactionFromCharge(event.type, charge, correlationId, {
    responseCode: charge.response?.code,
    responseMessage: charge.response?.message,
  });
}

/**
 * Handle charge.declined or charge.failed events
 * Payment was declined or failed
 */
export async function handleChargeFailed(
  event: TapWebhookEvent,
  correlationId: string,
): Promise<void> {
  const charge = event.data.object as TapChargeResponse;

  logger.warn("[Webhook] Charge failed or declined", {
    correlationId,
    chargeId: charge.id,
    status: charge.status,
    amount: charge.amount,
    customerEmail: charge.customer.email,
    responseCode: charge.response?.code,
    responseMessage: charge.response?.message,
  });

  const transaction = await upsertTransactionFromCharge(
    event.type,
    charge,
    correlationId,
    {
      responseCode: charge.response?.code,
      responseMessage: charge.response?.message,
    },
  );
  if (transaction) {
    await markInvoicePaymentStatus(
      transaction,
      charge,
      "FAILED",
      charge.response?.message,
    );
  }
}

/**
 * Handle refund.created event
 */
export async function handleRefundCreated(
  event: TapWebhookEvent,
  correlationId: string,
): Promise<void> {
  const refund = event.data.object as TapRefundResponse;

  logger.info("[Webhook] Refund created", {
    correlationId,
    refundId: refund.id,
    chargeId: refund.charge,
    amount: refund.amount,
  });

  await updateRefundRecord(refund, "PENDING", correlationId);
}

/**
 * Handle refund.succeeded event
 * Refund was successfully processed
 */
export async function handleRefundSucceeded(
  event: TapWebhookEvent,
  correlationId: string,
): Promise<void> {
  const refund = event.data.object as TapRefundResponse;

  logger.info("[Webhook] Refund succeeded", {
    correlationId,
    refundId: refund.id,
    chargeId: refund.charge,
    amount: refund.amount,
    currency: refund.currency,
    reason: refund.reason,
  });

  await updateRefundRecord(refund, "SUCCEEDED", correlationId);
}

/**
 * Handle refund.failed event
 * Refund failed to process
 */
export async function handleRefundFailed(
  event: TapWebhookEvent,
  correlationId: string,
): Promise<void> {
  const refund = event.data.object as TapRefundResponse;

  logger.error("[Webhook] Refund failed", {
    correlationId,
    refundId: refund.id,
    chargeId: refund.charge,
    amount: refund.amount,
    responseCode: refund.response?.code,
    responseMessage: refund.response?.message,
  });

  await updateRefundRecord(refund, "FAILED", correlationId);
}

/**
 * Route webhook event to appropriate handler
 */
export async function routeWebhookEvent(
  event: TapWebhookEvent,
  correlationId: string,
): Promise<void> {
  switch (event.type) {
    case "charge.created":
      await handleChargeCreated(event, correlationId);
      break;

    case "charge.captured":
      await handleChargeCaptured(event, correlationId);
      break;

    case "charge.authorized":
      await handleChargeAuthorized(event, correlationId);
      break;

    case "charge.declined":
    case "charge.failed":
      await handleChargeFailed(event, correlationId);
      break;

    case "refund.created":
      await handleRefundCreated(event, correlationId);
      break;

    case "refund.succeeded":
      await handleRefundSucceeded(event, correlationId);
      break;

    case "refund.failed":
      await handleRefundFailed(event, correlationId);
      break;

    default:
      logger.warn("[POST /api/payments/tap/webhook] Unhandled event type", {
        correlationId,
        eventType: event.type,
      });
  }
}
