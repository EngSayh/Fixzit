/**
 * Unit tests for parse utility functions
 * @see lib/utils/parse.ts
 */
import { describe, it, expect } from 'vitest';
import { parseIntSafe, parseIntFromQuery, parseFloatSafe } from '@/lib/utils/parse';

describe('parseIntSafe', () => {
  it('should parse valid integers with radix 10', () => {
    expect(parseIntSafe('42', 0)).toBe(42);
    expect(parseIntSafe('0755', 0)).toBe(755);
    expect(parseIntSafe('010', 0)).toBe(10);
  });

  it('should return fallback for null/undefined/empty', () => {
    expect(parseIntSafe(null, 10)).toBe(10);
    expect(parseIntSafe(undefined, 5)).toBe(5);
    expect(parseIntSafe('', 7)).toBe(7);
  });

  it('should return fallback for invalid input', () => {
    expect(parseIntSafe('abc', 99)).toBe(99);
  });
});

describe('parseIntFromQuery', () => {
  it('should parse query params', () => {
    expect(parseIntFromQuery('5', 1)).toBe(5);
    expect(parseIntFromQuery(null, 10)).toBe(10);
  });
});

describe('parseFloatSafe', () => {
  it('should parse valid floats', () => {
    expect(parseFloatSafe('3.14', 0)).toBe(3.14);
    expect(parseFloatSafe('100.5', 0)).toBe(100.5);
  });

  it('should return fallback for null/undefined/empty', () => {
    expect(parseFloatSafe(null, 1.5)).toBe(1.5);
    expect(parseFloatSafe(undefined, 2.5)).toBe(2.5);
    expect(parseFloatSafe('', 3.5)).toBe(3.5);
  });
});
