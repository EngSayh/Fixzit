import { NextRequest, NextResponse } from 'next/server';

import { isValidObjectId, type Document, type Model } from 'mongoose';

import { db, isMockDB } from '@/src/lib/mongo';
import {
  readPaytabsSignature,
  validateCallback,
  verifyPayment
} from '@/src/lib/paytabs';
import {
  normalizePaytabsStatus,
  normalizePaytabsString,
  parseCartAmount
} from '@/src/lib/paytabs/callback';
import { Invoice } from '@/src/server/models/Invoice';

export const runtime = 'nodejs';

const CURRENCY_TOLERANCE = 0.01;

type InvoicePaymentRecord = {
  date?: Date;
  amount?: number;
  method?: string;
  reference?: string;
  status?: string;
  transactionId?: string;
  notes?: string;
};

type InvoiceHistoryEntry = {
  action?: string;
  performedBy?: string;
  performedAt?: Date;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
};

type InvoiceDocument = Document & {
  status: string;
  currency?: string | null;
  total?: number | null;
  payments: InvoicePaymentRecord[] | undefined;
  history: InvoiceHistoryEntry[] | undefined;
  markModified?(path: string): void;
  save(): Promise<InvoiceDocument>;
};

export async function POST(req: NextRequest) {
  const signature = readPaytabsSignature(req.headers);

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  let rawBuffer: Buffer;

  try {
    rawBuffer = Buffer.from(await req.arrayBuffer());
  } catch (error) {
    console.error('Failed to read PayTabs callback body:', error);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const rawBody = rawBuffer.toString('utf8');

  // Validate callback signature against the raw payload bytes as provided by PayTabs
  try {
    if (!validateCallback(rawBuffer, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } catch (error) {
    console.error('Signature validation error (config?):', error);
    return NextResponse.json({ error: 'Signature validation failed' }, { status: 500 });
  }

  let body: unknown;

  try {
    body = JSON.parse(rawBody);
  } catch (error) {
    console.error('Failed to parse PayTabs callback payload:', error);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const callback = body as Record<string, unknown>;
    const transactionReference = normalizePaytabsString(callback.tran_ref);
    const cartId = normalizePaytabsString(callback.cart_id);
    const paymentResult = callback.payment_result;

    if (!transactionReference || !cartId || typeof paymentResult !== 'object' || paymentResult === null) {
      return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 });
    }

    const paymentInfo =
      typeof callback.payment_info === 'object' && callback.payment_info !== null
        ? (callback.payment_info as Record<string, unknown>)
        : {};
    const paymentMethod =
      normalizePaytabsString(paymentInfo.payment_method) ?? 'UNKNOWN';
    const cardScheme = normalizePaytabsString(paymentInfo.card_scheme);
    const schemeDisplay = cardScheme ?? paymentMethod;

    const amountValue = parseCartAmount(callback.cart_amount);

    if (amountValue === null) {
      return NextResponse.json({ error: 'Invalid cart amount' }, { status: 400 });
    }

    const structuredResult = paymentResult as Record<string, unknown>;
    const responseStatus = normalizePaytabsStatus(structuredResult.response_status);
    const responseMessage = normalizePaytabsString(structuredResult.response_message) ?? undefined;

    // Verify payment with PayTabs
    const verification = await verifyPayment(transactionReference);

    const verificationResult =
      verification && typeof verification === 'object'
        ? (verification as Record<string, unknown>)
        : {};
    const verificationPaymentResult =
      verificationResult.payment_result && typeof verificationResult.payment_result === 'object'
        ? (verificationResult.payment_result as Record<string, unknown>)
        : {};
    const verificationStatus = normalizePaytabsStatus(verificationPaymentResult.response_status);
    const verificationMessage =
      normalizePaytabsString(verificationPaymentResult.response_message) ?? undefined;

    if (!isMockDB && !isValidObjectId(cartId)) {
      return NextResponse.json({ error: 'Invalid cart_id' }, { status: 400 });
    }

    await db;
    const invoiceModel = Invoice as unknown as Model<InvoiceDocument>;
    const invoice = await invoiceModel.findById(cartId);

    if (!invoice) {
      console.error('Invoice not found for payment callback:', cartId);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const usingMockDb = isMockDB;

    let payments: InvoicePaymentRecord[];
    if (Array.isArray(invoice.payments)) {
      payments = usingMockDb ? invoice.payments : [...invoice.payments];
    } else if (usingMockDb) {
      invoice.payments = [];
      invoice.markModified?.('payments');
      payments = invoice.payments;
    } else {
      payments = [];
    }

    const historyEntries: InvoiceHistoryEntry[] = [];

    if (usingMockDb && !Array.isArray(invoice.history)) {
      invoice.history = [];
      invoice.markModified?.('history');
    }

    const appendHistory = (action: string, details: string) => {
      const entry: InvoiceHistoryEntry = {
        action,
        performedBy: 'SYSTEM',
        performedAt: new Date(),
        details
      };
      historyEntries.push(entry);

      if (usingMockDb && Array.isArray(invoice.history)) {
        invoice.history.push(entry);
        invoice.markModified?.('history');
      }
    };

    const cartCurrency =
      normalizePaytabsString(callback.cart_currency)?.toUpperCase() ?? '';
    const invoiceCurrency =
      typeof invoice.currency === 'string' && invoice.currency.trim() !== ''
        ? invoice.currency.trim().toUpperCase()
        : '';

    if (cartCurrency && invoiceCurrency && cartCurrency !== invoiceCurrency) {
      appendHistory(
        'PAYMENT_MISMATCH',
        `Rejected PayTabs callback with mismatched currency. Expected ${invoiceCurrency}, received ${cartCurrency}. Transaction: ${transactionReference}`
      );
      if (usingMockDb) {
        await invoice.save();
      } else if (historyEntries.length > 0) {
        await invoiceModel.updateOne(
          { _id: invoice._id },
          { $push: { history: { $each: historyEntries } } }
        );
        historyEntries.length = 0;
      }
      return NextResponse.json({ error: 'Currency mismatch' }, { status: 400 });
    }

    if (amountValue <= 0) {
      appendHistory(
        'PAYMENT_MISMATCH',
        `Rejected PayTabs callback with non-positive amount (${amountValue}). Transaction: ${transactionReference}`
      );
      if (usingMockDb) {
        await invoice.save();
      } else if (historyEntries.length > 0) {
        await invoiceModel.updateOne(
          { _id: invoice._id },
          { $push: { history: { $each: historyEntries } } }
        );
        historyEntries.length = 0;
      }
      return NextResponse.json({ error: 'Invalid cart amount' }, { status: 400 });
    }

    const invoiceTotal = typeof invoice.total === 'number' ? invoice.total : null;

    if (invoiceTotal !== null && Math.abs(invoiceTotal - amountValue) > CURRENCY_TOLERANCE) {
      appendHistory(
        'PAYMENT_MISMATCH',
        `Rejected PayTabs callback due to amount mismatch. Expected ${invoiceTotal.toFixed(2)}, received ${amountValue.toFixed(2)}. Transaction: ${transactionReference}`
      );
      if (usingMockDb) {
        await invoice.save();
      } else if (historyEntries.length > 0) {
        await invoiceModel.updateOne(
          { _id: invoice._id },
          { $push: { history: { $each: historyEntries } } }
        );
        historyEntries.length = 0;
      }
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    const findExistingPayment = () =>
      payments.find(
        (payment: InvoicePaymentRecord) => payment?.transactionId === transactionReference
      );

    const upsertPayment = async (
      status: 'COMPLETED' | 'FAILED',
      notes: string
    ): Promise<{ previousStatus: string | null; nextStatus: 'COMPLETED' | 'FAILED' }> => {
      const baseDetails = {
        date: new Date(),
        amount: amountValue,
        method: paymentMethod,
        reference: transactionReference,
        status,
        transactionId: transactionReference,
        notes
      };

      const existing = findExistingPayment();
      const previousStatus = existing?.status ?? null;

      if (usingMockDb) {
        if (existing) {
          existing.date = baseDetails.date;
          existing.amount = baseDetails.amount;
          existing.method = baseDetails.method;
          existing.reference = baseDetails.reference;
          existing.status = baseDetails.status;
          existing.transactionId = baseDetails.transactionId;
          existing.notes = baseDetails.notes;
        } else {
          payments.push(baseDetails);
        }
        invoice.markModified?.('payments');
        return { previousStatus, nextStatus: status };
      }

      if (existing) {
        await invoiceModel.updateOne(
          { _id: invoice._id, 'payments.transactionId': transactionReference },
          {
            $set: {
              'payments.$.date': baseDetails.date,
              'payments.$.amount': baseDetails.amount,
              'payments.$.method': baseDetails.method,
              'payments.$.reference': baseDetails.reference,
              'payments.$.status': baseDetails.status,
              'payments.$.transactionId': baseDetails.transactionId,
              'payments.$.notes': baseDetails.notes
            }
          }
        );
        Object.assign(existing, baseDetails);
        return { previousStatus, nextStatus: status };
      }

      const insertResult = await invoiceModel.updateOne(
        { _id: invoice._id, 'payments.transactionId': { $ne: transactionReference } },
        { $push: { payments: baseDetails } }
      );

      if (insertResult.modifiedCount === 0) {
        await invoiceModel.updateOne(
          { _id: invoice._id, 'payments.transactionId': transactionReference },
          {
            $set: {
              'payments.$.date': baseDetails.date,
              'payments.$.amount': baseDetails.amount,
              'payments.$.method': baseDetails.method,
              'payments.$.reference': baseDetails.reference,
              'payments.$.status': baseDetails.status,
              'payments.$.transactionId': baseDetails.transactionId,
              'payments.$.notes': baseDetails.notes
            }
          }
        );
      }

      payments.push(baseDetails);
      return { previousStatus, nextStatus: status };
    };

    // Update invoice based on payment result
    let nextInvoiceStatus = invoice.status;

    if (responseStatus === 'A' && verificationStatus === 'A') {
      // Payment successful
      const successNotes = `Payment via ${schemeDisplay}`;
      const { previousStatus, nextStatus } = await upsertPayment('COMPLETED', successNotes);
      const statusChanged = previousStatus !== nextStatus;
      nextInvoiceStatus = 'PAID';

      if (usingMockDb) {
        invoice.status = 'PAID';
      }

      if (statusChanged) {
        appendHistory(
          'PAID',
          `Payment completed via PayTabs. Transaction: ${transactionReference}`
        );
      }
    } else {
      // Payment failed
      const failureNotes = responseMessage || verificationMessage || 'Payment failed';
      const { previousStatus, nextStatus } = await upsertPayment('FAILED', failureNotes);
      const statusChanged = previousStatus !== nextStatus;

      if (statusChanged) {
        appendHistory(
          'PAYMENT_FAILED',
          `Payment failed: ${responseMessage ?? verificationMessage ?? 'Unknown reason'}. Transaction: ${transactionReference}`
        );
      }
    }

    if (usingMockDb) {
      await invoice.save();
    } else {
      const updatePayload: Record<string, any> = { $set: { status: nextInvoiceStatus } };
      if (historyEntries.length > 0) {
        updatePayload.$push = { history: { $each: historyEntries } };
      }
      await invoiceModel.updateOne({ _id: invoice._id }, updatePayload);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Payment callback error:', error);
    return NextResponse.json({ 
      error: 'Failed to process payment callback' 
    }, { status: 500 });
  }
}
