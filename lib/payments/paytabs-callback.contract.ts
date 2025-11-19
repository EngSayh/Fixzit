import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { createIdempotencyKey } from '@/server/security/idempotency';

export const PAYTABS_CALLBACK_MAX_BYTES =
  Number(process.env.PAYTABS_CALLBACK_MAX_BYTES ?? 32_768);

export const PAYTABS_CALLBACK_RATE_LIMIT = {
  requests: Number(process.env.PAYTABS_CALLBACK_RATE_LIMIT ?? 60),
  windowMs: Number(process.env.PAYTABS_CALLBACK_RATE_WINDOW_MS ?? 60_000),
};

export const PAYTABS_CALLBACK_IDEMPOTENCY_TTL_MS = Number(
  process.env.PAYTABS_CALLBACK_IDEMPOTENCY_TTL_MS ?? 5 * 60_000
);

export class PaytabsCallbackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaytabsCallbackValidationError';
  }
}

const RawPaytabsPayloadSchema = z
  .object({
    tran_ref: z.union([z.string(), z.number(), z.bigint()]).optional(),
    tranRef: z.union([z.string(), z.number(), z.bigint()]).optional(),
    transaction_reference: z.union([z.string(), z.number(), z.bigint()]).optional(),
    transactionReference: z.union([z.string(), z.number(), z.bigint()]).optional(),
    cart_id: z.union([z.string(), z.number(), z.bigint()]).optional(),
    cartId: z.union([z.string(), z.number(), z.bigint()]).optional(),
    invoice_id: z.union([z.string(), z.number(), z.bigint()]).optional(),
    order_id: z.union([z.string(), z.number(), z.bigint()]).optional(),
    resp_status: z.union([z.string(), z.number()]).optional(),
    respStatus: z.union([z.string(), z.number()]).optional(),
    resp_message: z.string().optional(),
    respMessage: z.string().optional(),
    token: z.string().optional(),
    payment_signature: z.string().optional(),
    sign: z.string().optional(),
    signature: z.string().optional(),
    cart_amount: z.union([z.string(), z.number()]).optional(),
    cartAmount: z.union([z.string(), z.number()]).optional(),
    tran_total: z.union([z.string(), z.number()]).optional(),
    amount: z.union([z.string(), z.number()]).optional(),
    cart_currency: z.string().optional(),
    tran_currency: z.string().optional(),
    currency: z.string().optional(),
    payment_method: z.string().optional(),
    customer_email: z.string().optional(),
    customerEmail: z.string().optional(),
    metadata: z.unknown().optional(),
    user_defined: z.unknown().optional(),
    userDefined: z.unknown().optional(),
    udf1: z.unknown().optional(),
    udf_1: z.unknown().optional(),
    udf01: z.unknown().optional(),
    payment_info: z
      .object({
        payment_method: z.string().optional(),
        payment_description: z.string().optional(),
        card_scheme: z.string().optional(),
        masked_card: z.string().optional(),
        metadata: z.unknown().optional(),
        customer_email: z.string().optional(),
      })
      .passthrough()
      .optional(),
    paymentInfo: z
      .object({
        payment_method: z.string().optional(),
        payment_description: z.string().optional(),
        card_scheme: z.string().optional(),
        masked_card: z.string().optional(),
        metadata: z.unknown().optional(),
        customer_email: z.string().optional(),
      })
      .passthrough()
      .optional(),
    payment_result: z
      .object({
        response_status: z.string().optional(),
        resp_status: z.string().optional(),
        response_message: z.string().optional(),
      })
      .passthrough()
      .optional(),
    paymentResult: z
      .object({
        response_status: z.string().optional(),
        resp_status: z.string().optional(),
        response_message: z.string().optional(),
      })
      .passthrough()
      .optional(),
    customer_details: z
      .object({
        email: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const PaytabsCallbackPayloadSchema = z.object({
  tranRef: z.string().min(1, 'PayTabs callback missing tran_ref/tranRef'),
  cartId: z.string().min(1, 'PayTabs callback missing cart_id/cartId'),
  respStatus: z.string().min(1, 'PayTabs callback missing respStatus'),
  respMessage: z.string().optional(),
  token: z.string().optional(),
  amount: z.number().nonnegative().optional(),
  currency: z.string().min(1).optional(),
  customerEmail: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  paymentMethod: z.string().optional(),
  paymentScheme: z.string().optional(),
  maskedCard: z.string().optional(),
});

export type PaytabsCallbackPayload = z.infer<typeof PaytabsCallbackPayloadSchema>;

export type RawPaytabsCallbackPayload = z.infer<typeof RawPaytabsPayloadSchema>;

export function parsePaytabsJsonPayload(rawBody: string): RawPaytabsCallbackPayload {
  try {
    const data = JSON.parse(rawBody);
    if (!data || typeof data !== 'object') {
      throw new PaytabsCallbackValidationError('PayTabs payload must be a JSON object');
    }
    return RawPaytabsPayloadSchema.parse(data);
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    if (error instanceof PaytabsCallbackValidationError) throw error;
    if (error instanceof z.ZodError) {
      throw new PaytabsCallbackValidationError(error.issues[0]?.message || 'Invalid PayTabs payload structure');
    }
    throw new PaytabsCallbackValidationError('Invalid JSON payload');
  }
}

export function normalizePaytabsCallbackPayload(
  data: unknown
): PaytabsCallbackPayload {
  if (!data || typeof data !== 'object') {
    throw new PaytabsCallbackValidationError('PayTabs payload must be an object');
  }
  const parsed = RawPaytabsPayloadSchema.parse(data);

  const tranRef = coerceString([
    parsed.tran_ref,
    parsed.tranRef,
    parsed.transaction_reference,
    parsed.transactionReference,
  ]);
  if (!tranRef) {
    throw new PaytabsCallbackValidationError('Missing transaction reference (tran_ref)');
  }

  const cartId = coerceString([
    parsed.cart_id,
    parsed.cartId,
    parsed.invoice_id,
    parsed.order_id,
  ]);
  if (!cartId) {
    throw new PaytabsCallbackValidationError('Missing cart identifier (cart_id)');
  }

  const respStatus = coerceString([
    parsed.payment_result?.response_status,
    parsed.payment_result?.resp_status,
    parsed.paymentResult?.response_status,
    parsed.paymentResult?.resp_status,
    parsed.resp_status,
    parsed.respStatus,
  ])?.toUpperCase();
  if (!respStatus) {
    throw new PaytabsCallbackValidationError('Missing payment status (respStatus)');
  }

  const normalized = {
    tranRef,
    cartId,
    respStatus,
    respMessage:
      coerceString([
        parsed.payment_result?.response_message,
        parsed.paymentResult?.response_message,
        parsed.resp_message,
        parsed.respMessage,
      ]) ?? undefined,
    token: parsed.token,
    amount: coerceNumber([
      parsed.cart_amount,
      parsed.cartAmount,
      parsed.tran_total,
      parsed.amount,
    ]),
    currency: coerceString([
      parsed.cart_currency,
      parsed.tran_currency,
      parsed.currency,
    ]),
    customerEmail: coerceString([
      parsed.customer_details?.email,
      parsed.customer_email,
      parsed.customerEmail,
      parsed.payment_info?.customer_email,
      parsed.paymentInfo?.customer_email,
    ]),
    metadata: mergeMetadata([
      parsed.metadata,
      parsed.user_defined,
      parsed.userDefined,
      parsed.udf1,
      parsed.udf_1,
      parsed.udf01,
      parsed.payment_info?.metadata,
      parsed.paymentInfo?.metadata,
    ]),
    paymentMethod: coerceString([
      parsed.payment_info?.payment_method,
      parsed.paymentInfo?.payment_method,
      parsed.payment_method,
    ]),
    paymentScheme: coerceString([
      parsed.payment_info?.card_scheme,
      parsed.paymentInfo?.card_scheme,
    ]),
    maskedCard: coerceString([
      parsed.payment_info?.payment_description,
      parsed.paymentInfo?.payment_description,
      parsed.payment_info?.masked_card,
      parsed.paymentInfo?.masked_card,
    ]),
  };

  return PaytabsCallbackPayloadSchema.parse(normalized);
}

export function enforcePaytabsPayloadSize(
  rawBody: string,
  maxBytes: number = PAYTABS_CALLBACK_MAX_BYTES
): void {
  const size = Buffer.byteLength(rawBody, 'utf8');
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) return;
  if (size > maxBytes) {
    throw new PaytabsCallbackValidationError(
      `PayTabs payload exceeds limit (${size} > ${maxBytes} bytes)`
    );
  }
}

export function extractPaytabsSignature(
  req: Pick<NextRequest, 'headers'>,
  payload?: RawPaytabsCallbackPayload
): string | null {
  const headerCandidates = [
    'x-paytabs-signature',
    'paytabs-signature',
    'signature',
  ];
  for (const header of headerCandidates) {
    const value = req.headers.get(header);
    if (value) return value;
  }
  if (!payload) return null;
  const payloadCandidates: Array<keyof RawPaytabsCallbackPayload> = [
    'signature',
    'payment_signature',
    'sign',
  ];
  for (const key of payloadCandidates) {
    const raw = payload[key];
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim();
    }
  }
  return null;
}

export function buildPaytabsIdempotencyKey(
  payload: PaytabsCallbackPayload,
  extra?: Record<string, unknown>
): string {
  return createIdempotencyKey('paytabs:callback', {
    tranRef: payload.tranRef,
    cartId: payload.cartId,
    status: payload.respStatus,
    ...(extra || {}),
  });
}

function coerceString(values: Array<unknown>): string | undefined {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
      continue;
    }
    if (typeof value === 'number' || typeof value === 'bigint') {
      const str = String(value);
      if (str) return str;
    }
  }
  return undefined;
}

function coerceNumber(values: Array<unknown>): number | undefined {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const num = Number(value);
      if (Number.isFinite(num)) {
        return num;
      }
    }
  }
  return undefined;
}

function mergeMetadata(
  candidates: Array<unknown>
): Record<string, unknown> | undefined {
  const merged: Record<string, unknown> = {};
  let hasData = false;
  for (const candidate of candidates) {
    const next = toMetadata(candidate);
    if (next) {
      Object.assign(merged, next);
      hasData = true;
    }
  }
  return hasData ? merged : undefined;
}

function toMetadata(value: unknown): Record<string, unknown> | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { ...parsed } as Record<string, unknown>;
      }
    } catch {
      return undefined;
    }
    return undefined;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return undefined;
}
