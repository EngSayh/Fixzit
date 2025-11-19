import { describe, expect, it } from 'vitest';

import {
  buildPaytabsIdempotencyKey,
  enforcePaytabsPayloadSize,
  extractPaytabsSignature,
  normalizePaytabsCallbackPayload,
  PaytabsCallbackValidationError,
} from '@/lib/payments/paytabs-callback.contract';

describe('normalizePaytabsCallbackPayload', () => {
  it('normalizes required fields and metadata sources', () => {
    const normalized = normalizePaytabsCallbackPayload({
      tran_ref: 'T-123',
      cart_id: 'C-456',
      payment_result: { response_status: 'a', response_message: 'Approved' },
      cart_amount: '100.50',
      cart_currency: 'SAR',
      metadata: { source: 'primary' },
      udf1: '{"trackingId":"ABC"}',
      payment_info: {
        payment_method: 'mada',
        payment_description: '****1111',
        card_scheme: 'mada',
      },
    });

    expect(normalized).toMatchObject({
      tranRef: 'T-123',
      cartId: 'C-456',
      respStatus: 'A',
      respMessage: 'Approved',
      amount: 100.5,
      currency: 'SAR',
      paymentMethod: 'mada',
      maskedCard: '****1111',
      paymentScheme: 'mada',
      metadata: {
        source: 'primary',
        trackingId: 'ABC',
      },
    });
  });

  it('throws validation error when required fields are missing', () => {
    expect(() =>
      normalizePaytabsCallbackPayload({
        cart_id: 'X',
        payment_result: { response_status: 'A' },
      })
    ).toThrow(PaytabsCallbackValidationError);
  });
});

describe('extractPaytabsSignature', () => {
  it('prefers headers over payload values', () => {
    const req = {
      headers: new Headers({ signature: 'header-sig' }),
    };
    const signature = extractPaytabsSignature(req, {
      signature: 'body-sig',
    } as any);
    expect(signature).toBe('header-sig');
  });

  it('falls back to payload signature fields when headers missing', () => {
    const req = { headers: new Headers() };
    const signature = extractPaytabsSignature(req, {
      payment_signature: 'payload-sig',
    } as any);
    expect(signature).toBe('payload-sig');
  });
});

describe('enforcePaytabsPayloadSize', () => {
  it('throws when body exceeds max bytes', () => {
    expect(() =>
      enforcePaytabsPayloadSize('a'.repeat(11), 10)
    ).toThrow(PaytabsCallbackValidationError);
  });
});

describe('buildPaytabsIdempotencyKey', () => {
  it('generates deterministic key for normalized payloads', () => {
    const key = buildPaytabsIdempotencyKey({
      tranRef: 'TRX',
      cartId: 'CART',
      respStatus: 'A',
    });
    expect(key.startsWith('paytabs:callback:')).toBe(true);
  });
});
