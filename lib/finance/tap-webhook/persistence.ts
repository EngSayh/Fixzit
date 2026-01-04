/**
 * @fileoverview Tap Payments webhook persistence helpers
 * @description Database operations for Tap transaction and payment records
 * @module lib/finance/tap-webhook/persistence
 */

import { Types } from "mongoose";
import { logger } from "@/lib/logger";
import {
  tapPayments,
  type TapChargeResponse,
  type TapRefundResponse,
} from "@/lib/finance/tap-payments";
import {
  TapTransaction,
  type TapTransactionDoc,
} from "@/server/models/finance/TapTransaction";
import { Payment } from "@/server/models/finance/Payment";
import { Invoice } from "@/server/models/Invoice";
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
 * Extract organization ID from charge metadata
 */
export function extractOrgId(
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

/**
 * Build transaction context from charge data
 */
export function transactionContextFromCharge(charge: TapChargeResponse) {
  return {
    partyType: "CUSTOMER",
    partyName:
      `${charge.customer?.first_name || ""} ${charge.customer?.last_name || ""}`.trim() ||
      charge.customer?.email,
  };
}

/**
 * Upsert a TapTransaction record from a charge event
 */
export async function upsertTransactionFromCharge(
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
  // eslint-disable-next-line local/require-lean -- NO_LEAN: needs Mongoose document for updates.
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

/**
 * Create Payment record for a successful charge
 */
export async function ensurePaymentForCharge(
  transaction: TapTransactionDoc,
  charge: TapChargeResponse,
  correlationId: string,
): Promise<void> {
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

/**
 * Allocate payment to invoice
 */
async function allocateInvoicePayment(
  transaction: TapTransactionDoc,
  payment: typeof Payment.prototype,
  charge: TapChargeResponse,
  amountSar: number,
  correlationId: string,
): Promise<void> {
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

/**
 * Mark invoice payment status for failed charges
 */
export async function markInvoicePaymentStatus(
  transaction: TapTransactionDoc,
  charge: TapChargeResponse,
  status: string,
  message?: string,
): Promise<void> {
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

/**
 * Update refund record in transaction and related entities
 */
export async function updateRefundRecord(
  refund: TapRefundResponse,
  status: "PENDING" | "SUCCEEDED" | "FAILED",
  correlationId: string,
): Promise<void> {
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
  // eslint-disable-next-line local/require-lean -- NO_LEAN: needs Mongoose document for updates.
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
    // SECURITY: Org-scoped filter prevents cross-tenant payment access
    const orgId = transaction.orgId?.toString();
    if (!orgId) {
      logger.warn("[Webhook] Missing orgId on Tap transaction for payment refund update", {
        correlationId,
        paymentId: transaction.paymentId.toString(),
        chargeId: refund.charge,
      });
    }
     
    const payment = orgId
      // eslint-disable-next-line local/require-lean -- NO_LEAN: payment is updated and saved
      ? await Payment.findOne({
          _id: transaction.paymentId,
          $or: [{ orgId }, { org_id: orgId }],
        })
      : null;
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
