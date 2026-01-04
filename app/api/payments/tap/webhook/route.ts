/**
 * @fileoverview Tap Payments Webhook API
 * @description Receives and processes Tap payment webhooks for charge and refund events.
 * Verifies signature, handles idempotency, and updates transaction/invoice records.
 * @route POST /api/payments/tap/webhook - Process Tap webhook events
 * @access Tap servers only - Signature verified
 * @module payments
 */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Types } from "mongoose";
import { logger } from "@/lib/logger";
import { Config } from "@/lib/config/constants";
import {
  tapPayments,
  type TapWebhookEvent,
  type TapChargeResponse,
  type TapRefundResponse,
} from "@/lib/finance/tap-payments";
import { connectToDatabase } from "@/lib/mongodb-unified";
import {
  TapTransaction,
  type TapTransactionDoc,
} from "@/server/models/finance/TapTransaction";
import { Payment } from "@/server/models/finance/Payment";
import { Invoice } from "@/server/models/Invoice";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";
import { withIdempotency } from "@/server/security/idempotency";
import type { InvoicePayment as CanonicalInvoicePayment } from "@/types/invoice";

interface TransactionEvent {
  type: string;
  status: string;
  at: Date;
  payload: unknown;
}

type InvoicePayment = CanonicalInvoicePayment & {
  transactionId?: string;
  status?: string;
  notes?: string;
};

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
const TAP_WEBHOOK_MAX_BYTES = Config.payment.tap.webhook.maxBytes;
const TAP_WEBHOOK_RATE_LIMIT = {
  requests: Config.payment.tap.webhook.rateLimit,
  windowMs: Config.payment.tap.webhook.rateWindowMs,
};
const TAP_WEBHOOK_IDEMPOTENCY_TTL_MS = Config.payment.tap.webhook.idempotencyTtlMs;

export async function POST(req: NextRequest) {
  const correlationId = randomUUID();

  try {
    const clientIp = getClientIP(req);
    const rl = await smartRateLimit(
      `tap-webhook:${clientIp}`,
      TAP_WEBHOOK_RATE_LIMIT.requests,
      TAP_WEBHOOK_RATE_LIMIT.windowMs,
    );
    if (!rl.allowed) {
      return rateLimitError();
    }

    // Get raw body for signature verification
    const rawBody = await req.text();
    const bodyBytes = Buffer.byteLength(rawBody, "utf8");
    if (
      Number.isFinite(TAP_WEBHOOK_MAX_BYTES) &&
      TAP_WEBHOOK_MAX_BYTES > 0 &&
      bodyBytes > TAP_WEBHOOK_MAX_BYTES
    ) {
      logger.warn(
        "[POST /api/payments/tap/webhook] Payload exceeds size limit",
        {
          correlationId,
          bodyBytes,
          limit: TAP_WEBHOOK_MAX_BYTES,
          clientIp,
        },
      );
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const signature = req.headers.get("x-tap-signature") || "";

    logger.info("[POST /api/payments/tap/webhook] Received webhook", {
      correlationId,
      signature: signature.substring(0, 10) + "...",
      bodyLength: rawBody.length,
    });

    // Parse and verify webhook event
    let event: TapWebhookEvent;
    try {
      event = tapPayments.parseWebhookEvent(rawBody, signature);
    } catch (error) {
      logger.error(
        "[POST /api/payments/tap/webhook] Invalid webhook signature or payload",
        {
          correlationId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }

    logger.info("[POST /api/payments/tap/webhook] Processing webhook event", {
      correlationId,
      eventId: event.id,
      eventType: event.type,
      liveMode: event.live_mode,
    });

    await withIdempotency(
      `tap:webhook:${event.id}`,
      async () => {
        await connectToDatabase();

        // Process event based on type
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
            logger.warn(
              "[POST /api/payments/tap/webhook] Unhandled event type",
              {
                correlationId,
                eventType: event.type,
              },
            );
        }
      },
      TAP_WEBHOOK_IDEMPOTENCY_TTL_MS,
    );

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ received: true, eventId: event.id });
  } catch (error) {
    logger.error("[POST /api/payments/tap/webhook] Error processing webhook", {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return 500 to signal Tap to retry
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        correlationId,
      },
      { status: 500 },
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
async function handleChargeCreated(
  event: TapWebhookEvent,
  correlationId: string,
) {
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
async function handleChargeCaptured(
  event: TapWebhookEvent,
  correlationId: string,
) {
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
async function handleChargeAuthorized(
  event: TapWebhookEvent,
  correlationId: string,
) {
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
async function handleChargeFailed(
  event: TapWebhookEvent,
  correlationId: string,
) {
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
 * Handle refund.created or refund.succeeded events
 * Refund was successfully processed
 */
async function handleRefundSucceeded(
  event: TapWebhookEvent,
  correlationId: string,
) {
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

async function handleRefundCreated(
  event: TapWebhookEvent,
  correlationId: string,
) {
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
 * Handle refund.failed event
 * Refund failed to process
 */
async function handleRefundFailed(
  event: TapWebhookEvent,
  correlationId: string,
) {
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
 * GET /api/payments/tap/webhook
 *
 * Webhook configuration endpoint (for testing/debugging)
 * Returns webhook URL that should be configured in Tap dashboard
 */
export async function GET(req: NextRequest) {
  const baseUrl = Config.app.baseUrl || req.nextUrl.origin;
  const webhookUrl = `${baseUrl}/api/payments/tap/webhook`;

  return NextResponse.json({
    webhookUrl,
    instructions:
      "Configure this URL in your Tap dashboard under Webhooks settings",
    events: [
      "charge.created",
      "charge.captured",
      "charge.authorized",
      "charge.declined",
      "charge.failed",
      "refund.created",
      "refund.succeeded",
      "refund.failed",
    ],
  });
}

// ============================================================================
// Persistence Helpers
// ============================================================================

async function upsertTransactionFromCharge(
  eventType: string,
  charge: TapChargeResponse,
  correlationId: string,
  payload: Record<string, unknown>,
): Promise<TapTransactionDoc | null> {
  const orgIdFromCharge = extractOrgId(charge.metadata);
  if (!orgIdFromCharge) {
    logger.error("[Webhook] Missing organizationId metadata on Tap charge", {
      correlationId,
      chargeId: charge.id,
    });
    return null;
  }
  // Use $eq operator to prevent NoSQL injection from user-controlled metadata
  const transactionFilter = {
    chargeId: { $eq: charge.id },
    orgId: { $eq: orgIdFromCharge },
  };
  // NO_LEAN: needs Mongoose document for updates.
  // eslint-disable-next-line local/require-lean -- NO_LEAN: Document needed for .save()
  let transaction = await TapTransaction.findOne(transactionFilter);

  if (!transaction) {
    transaction = new TapTransaction({
      orgId: orgIdFromCharge,
      userId:
        typeof charge.metadata?.userId === "string"
          ? charge.metadata?.userId
          : undefined,
      chargeId: charge.id,
      orderId: charge.reference?.order,
      correlationId,
      status: charge.status,
      currency: charge.currency || "SAR",
      amountHalalas: charge.amount,
      amountSAR: tapPayments.halalasToSAR(charge.amount || 0),
      paymentContext: transactionContextFromCharge(charge),
      metadata: {},
      tapMetadata: charge.metadata,
      rawCharge: charge,
      events: [],
    });
  }

  transaction.status = charge.status;
  transaction.currency = charge.currency || transaction.currency;
  transaction.amountHalalas = charge.amount || transaction.amountHalalas;
  transaction.amountSAR = tapPayments.halalasToSAR(
    transaction.amountHalalas || 0,
  );
  transaction.orderId = transaction.orderId || charge.reference?.order;
  transaction.tapMetadata = charge.metadata;
  transaction.rawCharge = charge;
  transaction.lastEventAt = new Date();
  transaction.redirectUrl = charge.transaction?.url || transaction.redirectUrl;
  if (charge.transaction?.expiry?.period) {
    transaction.expiresAt = new Date(
      Date.now() + (charge.transaction.expiry.period ?? 0) * 60000,
    );
  }

  transaction.events = transaction.events || [];
  const events = transaction.events as unknown as TransactionEvent[];
  events.push({
    type: eventType,
    status: charge.status,
    at: new Date(),
    payload,
  });
  if (events.length > 25) {
    transaction.events = events.slice(
      events.length - 25,
    ) as typeof transaction.events;
  }

  await transaction.save();
  return transaction;
}

async function ensurePaymentForCharge(
  transaction: TapTransactionDoc,
  charge: TapChargeResponse,
  correlationId: string,
) {
  if (transaction.paymentId) {
    return;
  }

  const amountSAR = tapPayments.halalasToSAR(
    charge.amount || transaction.amountHalalas || 0,
  );
  const partyName =
    transaction.paymentContext?.partyName ||
    `${charge.customer?.first_name || ""} ${charge.customer?.last_name || ""}`.trim() ||
    charge.customer?.email ||
    "Customer";
  const partyType = transaction.paymentContext?.partyType || "CUSTOMER";

  const paymentPayload: Record<string, unknown> = {
    orgId: transaction.orgId,
    paymentDate: new Date(),
    paymentType: "RECEIVED",
    paymentMethod: "ONLINE",
    amount: amountSAR,
    currency: charge.currency || "SAR",
    status: "POSTED",
    partyType,
    partyName,
    referenceNumber: charge.id,
    notes: transaction.paymentContext?.notes,
    receiptUrl: charge.transaction?.url,
    cardDetails: {
      transactionId: charge.id,
      authorizationCode: charge.response?.code,
    },
    createdBy: transaction.userId,
  };

  if (
    transaction.paymentContext?.partyId &&
    Types.ObjectId.isValid(transaction.paymentContext.partyId)
  ) {
    paymentPayload.partyId = new Types.ObjectId(
      transaction.paymentContext.partyId,
    );
  }

  const payment = await Payment.create(
    paymentPayload as Record<string, unknown>,
  );
  transaction.paymentId = payment._id;
  await transaction.save();

  await allocateInvoicePayment(
    transaction,
    payment,
    charge,
    amountSAR,
    correlationId,
  );
}

async function allocateInvoicePayment(
  transaction: TapTransactionDoc,
  payment: typeof Payment.prototype,
  charge: TapChargeResponse,
  amountSar: number,
  correlationId: string,
) {
  if (!transaction.invoiceId) {
    return;
  }

  // SECURITY: Org-scoped filter prevents cross-tenant invoice access
  const orgId = transaction.orgId?.toString();
  if (!orgId) {
    logger.warn("[Webhook] No orgId on TapTransaction, skipping invoice allocation", {
      correlationId,
      invoiceId: transaction.invoiceId?.toString(),
    });
    return;
  }
  const orgScopedInvoiceFilter = {
    _id: transaction.invoiceId,
    $or: [{ orgId }, { org_id: orgId }],
  };
  // eslint-disable-next-line local/require-lean -- NO_LEAN: invoice is updated and saved.
  const invoice = await Invoice.findOne(orgScopedInvoiceFilter);
  if (!invoice) {
    logger.warn("[Webhook] Invoice not found for Tap payment allocation (org-scoped)", {
      correlationId,
      invoiceId: transaction.invoiceId?.toString(),
      chargeId: charge.id,
      orgId,
    });
    return;
  }

  try {
    await payment.allocateToInvoice(
      transaction.invoiceId,
      invoice.number || transaction.invoiceId.toString(),
      amountSar,
    );
    await payment.save();
  } catch (allocationError) {
    logger.warn("[Webhook] Failed to allocate Tap payment to invoice", {
      correlationId,
      invoiceId: invoice._id.toString(),
      error:
        allocationError instanceof Error
          ? allocationError.message
          : allocationError,
    });
  }

  invoice.payments = invoice.payments || [];
  const paymentsTyped = invoice.payments as unknown as InvoicePayment[];
  const existing = paymentsTyped.find((p) => p.transactionId === charge.id);
  if (existing) {
    existing.status = "COMPLETED";
    existing.notes = "Paid via Tap";
  } else {
    invoice.payments.push({
      date: new Date(),
      amount: amountSar,
      method: "TAP_PAYMENTS",
      reference: charge.id,
      status: "COMPLETED",
      transactionId: charge.id,
      notes: "Paid via Tap",
    });
  }
  invoice.status = "PAID";
  invoice.history = invoice.history || [];
  invoice.history.push({
    action: "PAID",
    performedBy: transaction.userId || "tap-webhook",
    performedAt: new Date(),
    details: "Payment captured via Tap webhook",
    ipAddress: "tap-webhook",
    userAgent: "tap-webhook",
  });
  invoice.updatedBy = transaction.userId || invoice.updatedBy;
  await invoice.save();
}

async function markInvoicePaymentStatus(
  transaction: TapTransactionDoc,
  charge: TapChargeResponse,
  status: string,
  message?: string,
) {
  if (!transaction.invoiceId) {
    return;
  }
  // SECURITY: Org-scoped filter prevents cross-tenant invoice access
  const orgId = transaction.orgId?.toString();
  if (!orgId) {
    return;
  }
  const orgScopedInvoiceFilter = {
    _id: transaction.invoiceId,
    $or: [{ orgId }, { org_id: orgId }],
  };
  // eslint-disable-next-line local/require-lean -- NO_LEAN: invoice is updated and saved.
  const invoice = await Invoice.findOne(orgScopedInvoiceFilter);
  if (!invoice) {
    return;
  }

  invoice.payments = invoice.payments || [];
  const amount = tapPayments.halalasToSAR(
    charge.amount || transaction.amountHalalas || 0,
  );
  const paymentsTyped = invoice.payments as unknown as InvoicePayment[];
  const existing = paymentsTyped.find((p) => p.transactionId === charge.id);
  if (existing) {
    existing.status = status;
    existing.notes = message;
  } else {
    invoice.payments.push({
      date: new Date(),
      amount,
      method: "TAP_PAYMENTS",
      reference: charge.id,
      status,
      transactionId: charge.id,
      notes: message,
    });
  }
  await invoice.save();
}

async function updateRefundRecord(
  refund: TapRefundResponse,
  status: "PENDING" | "SUCCEEDED" | "FAILED",
  correlationId: string,
) {
  const orgIdFromRefund = extractOrgId(refund.metadata);
  if (!orgIdFromRefund) {
    logger.warn("[Webhook] Missing organizationId metadata on Tap refund", {
      correlationId,
      refundId: refund.id,
      chargeId: refund.charge,
    });
    return;
  }
  // Use $eq operator to prevent NoSQL injection from user-controlled metadata
  const refundFilter = {
    chargeId: { $eq: refund.charge },
    orgId: { $eq: orgIdFromRefund },
  };
  // NO_LEAN: needs Mongoose document for updates.
  // eslint-disable-next-line local/require-lean -- NO_LEAN: Document needed for .save()
  const transaction = await TapTransaction.findOne(refundFilter);
  if (!transaction) {
    logger.warn("[Webhook] Refund received for unknown Tap transaction", {
      correlationId,
      refundId: refund.id,
      chargeId: refund.charge,
    });
    return;
  }

  transaction.refunds = transaction.refunds || [];
  const existingRefund = transaction.refunds.find(
    (r) => r.refundId === refund.id,
  );
  const amountSar = tapPayments.halalasToSAR(refund.amount || 0);
  if (existingRefund) {
    existingRefund.status = status;
    existingRefund.reason = refund.reason;
    existingRefund.processedAt = new Date();
  } else {
    transaction.refunds.push({
      refundId: refund.id,
      status,
      amountHalalas: refund.amount,
      amountSAR: amountSar,
      currency: refund.currency,
      reason: refund.reason,
      processedAt: new Date(),
    });
  }
  transaction.events = transaction.events || [];
  const eventsTyped = transaction.events as unknown as TransactionEvent[];
  eventsTyped.push({
    type:
      status === "SUCCEEDED"
        ? "refund.succeeded"
        : status === "FAILED"
          ? "refund.failed"
          : "refund.created",
    status,
    at: new Date(),
    payload: {
      refundId: refund.id,
      responseCode: refund.response?.code,
      responseMessage: refund.response?.message,
    },
  });
  if (eventsTyped.length > 25) {
    transaction.events = eventsTyped.slice(
      eventsTyped.length - 25,
    ) as unknown as typeof transaction.events;
  }
  await transaction.save();

  if (transaction.paymentId) {
    // SEC-002 FIX: Scope Payment lookup by orgId to prevent cross-tenant access
    let payment: typeof Payment.prototype | null = null;
    if (transaction.orgId) {
      // eslint-disable-next-line local/require-lean -- NO_LEAN: payment is updated and saved.
      payment = await Payment.findOne({
        _id: transaction.paymentId,
        orgId: transaction.orgId,
      });
    } else {
      // eslint-disable-next-line local/require-lean -- NO_LEAN: legacy payments require document updates.
      payment = await Payment.findById(transaction.paymentId);
    }
    if (payment) {
      if (status === "SUCCEEDED") {
        payment.status = "REFUNDED";
        payment.isRefund = true;
      }
      if (status === "FAILED" && payment.status === "REFUNDED") {
        payment.status = "POSTED";
      }
      payment.refundReason = refund.reason;
      await payment.save();
    }
  }

  if (transaction.invoiceId) {
    // SECURITY: Org-scoped filter prevents cross-tenant invoice access
    const orgId = transaction.orgId?.toString();
    if (orgId) {
      const orgScopedInvoiceFilter = {
        _id: transaction.invoiceId,
        $or: [{ orgId }, { org_id: orgId }],
      };
      // eslint-disable-next-line local/require-lean -- NO_LEAN: invoice is updated and saved.
      const invoice = await Invoice.findOne(orgScopedInvoiceFilter);
      if (invoice) {
        const paymentsTyped = invoice.payments as unknown as
          | InvoicePayment[]
          | undefined;
        const entry = paymentsTyped?.find(
          (p) => p.transactionId === refund.charge,
        );
        if (entry) {
          entry.status = status === "SUCCEEDED" ? "REFUNDED" : status;
          entry.notes = refund.reason || entry.notes;
        }
        await invoice.save();
      }
    }
  }
}

function extractOrgId(
  metadata?: Record<string, unknown>,
): Types.ObjectId | null {
  const orgValue =
    metadata?.organizationId || metadata?.orgId || metadata?.tenantId;
  if (typeof orgValue === "string" && Types.ObjectId.isValid(orgValue)) {
    return new Types.ObjectId(orgValue);
  }
  if (orgValue instanceof Types.ObjectId) {
    return orgValue;
  }
  return null;
}

function transactionContextFromCharge(charge: TapChargeResponse) {
  return {
    partyType: "CUSTOMER",
    partyName:
      `${charge.customer?.first_name || ""} ${charge.customer?.last_name || ""}`.trim() ||
      charge.customer?.email,
  };
}
