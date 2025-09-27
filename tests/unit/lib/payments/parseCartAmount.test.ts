import { parseCartAmount, parseCartAmountOrThrow } from '@/src/lib/payments/parseCartAmount';

describe('parseCartAmount', () => {
  it('returns finite numbers as-is', () => {
    expect(parseCartAmount(123.45)).toBe(123.45);
  });

  it('parses numeric strings with decimals', () => {
    expect(parseCartAmount('456.78')).toBeCloseTo(456.78);
  });

  it('parses strings with commas and currency symbols', () => {
    expect(parseCartAmount('SAR 1,234.56')).toBeCloseTo(1234.56);
  });

  it('falls back to default when parsing fails', () => {
    expect(parseCartAmount('invalid', 99)).toBe(99);
  });
});

describe('parseCartAmountOrThrow', () => {
  it('returns parsed value when valid', () => {
    expect(parseCartAmountOrThrow('77.5')).toBeCloseTo(77.5);
  });

  it('throws when parsing fails', () => {
    expect(() => parseCartAmountOrThrow('bad', 'Amount error')).toThrow('Amount error');
  });
});
