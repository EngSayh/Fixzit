import { describe, test, expect } from 'vitest';
import { parseCartAmount } from '@/lib/payments/parseCartAmount';

test('accepts numeric input', () => {
  expect(parseCartAmount(249.99)).toBe(249.99);
  expect(parseCartAmount(0)).toBe(0);
});

test('parses decimal strings with dot separators', () => {
  expect(parseCartAmount(' 147.25 ')).toBe(147.25);
  expect(parseCartAmount('-42.5')).toBe(-42.5);
});

test('parses values with grouping commas', () => {
  expect(parseCartAmount('1,234.56')).toBe(1234.56);
  expect(parseCartAmount('12,345')).toBe(12345);
});

test('parses values with european decimal comma', () => {
  expect(parseCartAmount('1.234,56')).toBe(1234.56);
  expect(parseCartAmount('1234,5')).toBe(1234.5);
});

test('rejects malformed inputs', () => {
  expect(parseCartAmount('')).toBe(null);
  expect(parseCartAmount('  ')).toBe(null);
  expect(parseCartAmount('abc')).toBe(null);
  expect(parseCartAmount('12.34.56')).toBe(null);
  expect(parseCartAmount('1,2,3')).toBe(null);
  expect(parseCartAmount(null as any)).toBe(null);
  expect(parseCartAmount(undefined as any)).toBe(null);
});

test('rejects non-finite numbers', () => {
  expect(parseCartAmount(Infinity)).toBe(null);
  expect(parseCartAmount(NaN)).toBe(null);
  expect(parseCartAmount('NaN')).toBe(null);
});

test('parses values with currency markers', () => {
  expect(parseCartAmount('SAR\u00A01,234.50')).toBe(1234.5);
  expect(parseCartAmount('1\u00A0234,50\u00A0SAR')).toBe(1234.5);
  expect(parseCartAmount('د.إ.‏1,234.50')).toBe(1234.5);
});
