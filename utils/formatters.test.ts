import { describe, it, expect } from 'vitest';
import { sanitizePhoneNumber, formatCurrency, formatNumber } from './formatters';

describe('sanitizePhoneNumber', () => {
  it('should remove spaces, dashes, parentheses, and leading plus', () => {
    expect(sanitizePhoneNumber('+1 (123) 456-7890')).toBe('11234567890');
  });

  it('should handle Saudi numbers with formatting', () => {
    expect(sanitizePhoneNumber('+966 50 123 4567')).toBe('966501234567');
  });

  it('should handle empty or null input', () => {
    expect(sanitizePhoneNumber('')).toBe('');
    expect(sanitizePhoneNumber(null)).toBe('');
    expect(sanitizePhoneNumber(undefined)).toBe('');
  });

  it('should handle numbers with various special characters', () => {
    expect(sanitizePhoneNumber('+1-555-123-4567')).toBe('15551234567');
    expect(sanitizePhoneNumber('(555) 123.4567')).toBe('5551234567');
    expect(sanitizePhoneNumber('555 123 4567 ext. 123')).toBe('5551234567123');
  });

  it('should preserve digits only', () => {
    expect(sanitizePhoneNumber('1234567890')).toBe('1234567890');
  });
});

describe('formatCurrency', () => {
  it('should format SAR correctly without decimals by default', () => {
    const result = formatCurrency(1234567.89);
    // The result should contain the amount with thousand separators
    expect(result).toContain('1,234,568');
    expect(result).toContain('SAR');
  });

  it('should format USD correctly if specified', () => {
    const result = formatCurrency(1000, 'USD');
    expect(result).toContain('1,000');
  });

  it('should handle decimal places when specified', () => {
    const result = formatCurrency(1234.56, 'SAR', 2, 2);
    expect(result).toContain('1,234.56');
  });

  it('should handle zero amounts', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  it('should handle negative amounts', () => {
    const result = formatCurrency(-1000);
    expect(result).toContain('1,000');
  });
});

describe('formatNumber', () => {
  it('should format numbers with grouping separators', () => {
    expect(formatNumber(12345)).toBe('12,345');
  });

  it('should round decimals', () => {
    expect(formatNumber(12345.67)).toBe('12,346');
    expect(formatNumber(12345.4)).toBe('12,345');
  });

  it('should handle zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('should handle large numbers', () => {
    expect(formatNumber(1234567890)).toBe('1,234,567,890');
  });

  it('should handle negative numbers', () => {
    const result = formatNumber(-12345);
    expect(result).toContain('12,345');
  });
});
