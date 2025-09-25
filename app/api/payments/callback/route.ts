import { NextRequest, NextResponse } from 'next/server';

import type { Document } from 'mongoose';

import { db } from '@/src/lib/mongo';
import { verifyPayment, validateCallback } from '@/src/lib/paytabs';
import { Invoice } from '@/src/server/models/Invoice';

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
  markModified(path: string): void;
  save(): Promise<InvoiceDocument>;
};

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const signatureHeader =
    req.headers.get('signature') ??
    req.headers.get('x-signature') ??
    req.headers.get('x-paytabs-signature') ??
    '';
  const signature = signatureHeader.trim();

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
    const { tran_ref, cart_id, payment_result } = callback;

    if (
      typeof tran_ref !== 'string' || tran_ref.trim() === '' ||
      typeof cart_id !== 'string' || cart_id.trim() === '' ||
      typeof payment_result !== 'object' || payment_result === null
    ) {
      return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 });
    }

    const transactionReference = tran_ref.trim();
    const cartId = cart_id.trim();

    const paymentInfo =
      typeof callback.payment_info === 'object' && callback.payment_info !== null
        ? (callback.payment_info as Record<string, unknown>)
        : {};
    const paymentMethod =
      typeof paymentInfo.payment_method === 'string' && paymentInfo.payment_method.trim() !== ''
        ? paymentInfo.payment_method
        : 'UNKNOWN';
    const cardScheme =
      typeof paymentInfo.card_scheme === 'string' && paymentInfo.card_scheme.trim() !== ''
        ? paymentInfo.card_scheme
        : paymentMethod;

    const amountValue = (() => {
      const rawAmount = callback.cart_amount;

      if (typeof rawAmount === 'number' && Number.isFinite(rawAmount)) {
        return rawAmount;
      }

      if (typeof rawAmount === 'string') {
        const parsed = Number.parseFloat(rawAmount);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }

      return null;
    })();

    if (amountValue === null) {
      return NextResponse.json({ error: 'Invalid cart amount' }, { status: 400 });
    }

    const paymentResult = payment_result as Record<string, unknown>;
    const responseStatus =
      typeof paymentResult.response_status === 'string'
        ? paymentResult.response_status
        : '';
    const responseMessage =
      typeof paymentResult.response_message === 'string'
        ? paymentResult.response_message
        : undefined;

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
    const verificationStatus =
      typeof verificationPaymentResult.response_status === 'string'
        ? verificationPaymentResult.response_status
        : '';
    const verificationMessage =
      typeof verificationPaymentResult.response_message === 'string'
        ? verificationPaymentResult.response_message
        : undefined;

    await db;
    const invoiceModel = Invoice as unknown as { findById(id: string): Promise<InvoiceDocument | null> };
    const invoice = await invoiceModel.findById(cartId);

    if (!invoice) {
      console.error('Invoice not found for payment callback:', cartId);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    let payments: InvoicePaymentRecord[];
    if (Array.isArray(invoice.payments)) {
      payments = invoice.payments;
    } else {
      payments = [];
      invoice.payments = payments;
      invoice.markModified('payments');
    }

    let history: InvoiceHistoryEntry[];
    if (Array.isArray(invoice.history)) {
      history = invoice.history;
    } else {
      history = [];
      invoice.history = history;
      invoice.markModified('history');
    }

    const appendHistory = (action: string, details: string) => {
      history.push({
        action,
        performedBy: 'SYSTEM',
        performedAt: new Date(),
        details
      });
      invoice.markModified('history');
    };

    const cartCurrency =
      typeof callback.cart_currency === 'string' && callback.cart_currency.trim() !== ''
        ? callback.cart_currency.trim().toUpperCase()
        : '';
    const invoiceCurrency =
      typeof invoice.currency === 'string' && invoice.currency.trim() !== ''
        ? invoice.currency.trim().toUpperCase()
        : '';

    if (cartCurrency && invoiceCurrency && cartCurrency !== invoiceCurrency) {
      appendHistory(
        'PAYMENT_MISMATCH',
        `Rejected PayTabs callback with mismatched currency. Expected ${invoiceCurrency}, received ${cartCurrency}. Transaction: ${transactionReference}`
      );
      await invoice.save();
      return NextResponse.json({ error: 'Currency mismatch' }, { status: 400 });
    }

    if (amountValue <= 0) {
      appendHistory(
        'PAYMENT_MISMATCH',
        `Rejected PayTabs callback with non-positive amount (${amountValue}). Transaction: ${transactionReference}`
      );
      await invoice.save();
      return NextResponse.json({ error: 'Invalid cart amount' }, { status: 400 });
    }

    const invoiceTotal = typeof invoice.total === 'number' ? invoice.total : null;

    if (invoiceTotal !== null && Math.abs(invoiceTotal - amountValue) > 0.01) {
      appendHistory(
        'PAYMENT_MISMATCH',
        `Rejected PayTabs callback due to amount mismatch. Expected ${invoiceTotal.toFixed(2)}, received ${amountValue.toFixed(2)}. Transaction: ${transactionReference}`
      );
      await invoice.save();
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    const existingPayment = payments.find(
      (payment: InvoicePaymentRecord) => payment?.transactionId === transactionReference
    );

    const upsertPayment = (
      status: 'COMPLETED' | 'FAILED',
      notes: string
    ) => {
      const baseDetails = {
        date: new Date(),
        amount: amountValue,
        method: paymentMethod,
        reference: transactionReference,
        status,
        transactionId: transactionReference,
        notes
      };

      if (existingPayment) {
        const detailsChanged =
          existingPayment.status !== baseDetails.status ||
          existingPayment.amount !== baseDetails.amount ||
          existingPayment.method !== baseDetails.method ||
          existingPayment.notes !== baseDetails.notes;

        if (detailsChanged) {
          existingPayment.date = baseDetails.date;
          existingPayment.amount = baseDetails.amount;
          existingPayment.method = baseDetails.method;
          existingPayment.reference = baseDetails.reference;
          existingPayment.status = baseDetails.status;
          existingPayment.transactionId = baseDetails.transactionId;
          existingPayment.notes = baseDetails.notes;
          invoice.markModified('payments');
        }
      } else {
        payments.push(baseDetails);
        invoice.markModified('payments');
      }
    };

    // Update invoice based on payment result
    if (responseStatus === 'A' && verificationStatus === 'A') {
      // Payment successful
      invoice.status = 'PAID';
      const successNotes = `Payment via ${cardScheme}`;
      const statusChanged = existingPayment?.status !== 'COMPLETED';
      upsertPayment('COMPLETED', successNotes);

      if (statusChanged) {
        appendHistory(
          'PAID',
          `Payment completed via PayTabs. Transaction: ${transactionReference}`
        );
      }
    } else {
      // Payment failed
      const failureNotes = responseMessage || verificationMessage || 'Payment failed';
      const statusChanged = existingPayment?.status !== 'FAILED';
      upsertPayment('FAILED', failureNotes);

      if (statusChanged) {
        appendHistory(
          'PAYMENT_FAILED',
          `Payment failed: ${responseMessage ?? verificationMessage ?? 'Unknown reason'}. Transaction: ${transactionReference}`
        );
      }
    }

    await invoice.save();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Payment callback error:', error);
    return NextResponse.json({ 
      error: 'Failed to process payment callback' 
    }, { status: 500 });
  }
}
