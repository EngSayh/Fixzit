import { NextRequest, NextResponse } from 'next/server';

import type { Document } from 'mongoose';

import { db } from '@/src/lib/mongo';
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
      const successNotes = `Payment via ${schemeDisplay}`;
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
