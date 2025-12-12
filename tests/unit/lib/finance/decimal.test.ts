/**
 * @fileoverview Tests for decimal.ts (finance module)
 * Tests precise money calculations using Decimal.js
 */

import { describe, it, expect } from 'vitest';
import {
  BudgetMath,
  InvoiceMath,
  Money,
  PaymentMath,
  decimal,
  formatDecimalCurrency,
} from '@/lib/finance/decimal';
import Decimal from 'decimal.js';

describe('decimal.ts', () => {
  describe('decimal() function', () => {
    it('should create Decimal from number', () => {
      const result = decimal(100.50);
      expect(result.toString()).toBe('100.5');
    });

    it('should create Decimal from string', () => {
      const result = decimal('1234.56');
      expect(result.toString()).toBe('1234.56');
    });

    it('should create Decimal from another Decimal', () => {
      const original = new Decimal(999.99);
      const result = decimal(original);
      expect(result.toString()).toBe('999.99');
    });

    it('should return 0 for null', () => {
      const result = decimal(null);
      expect(result.isZero()).toBe(true);
    });

    it('should return 0 for undefined', () => {
      const result = decimal(undefined);
      expect(result.isZero()).toBe(true);
    });

    it('should return 0 for empty string', () => {
      const result = decimal('');
      expect(result.isZero()).toBe(true);
    });

    it('should handle negative numbers', () => {
      const result = decimal(-500.25);
      expect(result.toString()).toBe('-500.25');
    });
  });

  describe('Money.add()', () => {
    it('should add two numbers', () => {
      const result = Money.add(100, 50);
      expect(result.toNumber()).toBe(150);
    });

    it('should add multiple values', () => {
      const result = Money.add(10, 20, 30, 40);
      expect(result.toNumber()).toBe(100);
    });

    it('should handle strings', () => {
      const result = Money.add('100.50', '49.50');
      expect(result.toNumber()).toBe(150);
    });

    it('should handle Decimals', () => {
      const result = Money.add(new Decimal(75), new Decimal(25));
      expect(result.toNumber()).toBe(100);
    });

    it('should avoid floating-point errors', () => {
      // Classic floating-point issue: 0.1 + 0.2 !== 0.3
      const result = Money.add(0.1, 0.2);
      expect(result.toString()).toBe('0.3');
    });

    it('should handle negative values', () => {
      const result = Money.add(100, -30);
      expect(result.toNumber()).toBe(70);
    });
  });

  describe('Money.subtract()', () => {
    it('should subtract two numbers', () => {
      const result = Money.subtract(100, 30);
      expect(result.toNumber()).toBe(70);
    });

    it('should handle strings', () => {
      const result = Money.subtract('500.00', '123.45');
      expect(result.toNumber()).toBe(376.55);
    });

    it('should return negative when b > a', () => {
      const result = Money.subtract(50, 100);
      expect(result.toNumber()).toBe(-50);
    });
  });

  describe('Money.multiply()', () => {
    it('should multiply two numbers', () => {
      const result = Money.multiply(100, 0.15);
      expect(result.toNumber()).toBe(15);
    });

    it('should handle quantity x rate', () => {
      // 5 items at 29.99 each
      const result = Money.multiply(5, 29.99);
      expect(result.toNumber()).toBe(149.95);
    });

    it('should handle strings', () => {
      const result = Money.multiply('100', '0.0825'); // 8.25% tax
      expect(result.toString()).toBe('8.25');
    });
  });

  describe('Money.divide()', () => {
    it('should divide two numbers', () => {
      const result = Money.divide(100, 4);
      expect(result.toNumber()).toBe(25);
    });

    it('should throw on division by zero', () => {
      expect(() => Money.divide(100, 0)).toThrow(RangeError);
    });

    it('should throw with descriptive message', () => {
      expect(() => Money.divide(500, 0)).toThrow(/Division by zero/);
    });

    it('should handle non-even division', () => {
      const result = Money.divide(100, 3);
      expect(result.toNumber()).toBeCloseTo(33.33, 1);
    });
  });

  describe('Money.percentage()', () => {
    it('should calculate 15% of 200', () => {
      const result = Money.percentage(200, 15);
      expect(result.toNumber()).toBe(30);
    });

    it('should calculate VAT at 15%', () => {
      const result = Money.percentage(1000, 15);
      expect(result.toNumber()).toBe(150);
    });

    it('should handle small percentages', () => {
      const result = Money.percentage(10000, 0.5);
      expect(result.toNumber()).toBe(50);
    });

    it('should handle 100%', () => {
      const result = Money.percentage(500, 100);
      expect(result.toNumber()).toBe(500);
    });

    it('should handle 0%', () => {
      const result = Money.percentage(500, 0);
      expect(result.toNumber()).toBe(0);
    });
  });

  describe('Money.percentageOf()', () => {
    it('should calculate what percentage 25 is of 100', () => {
      const result = Money.percentageOf(25, 100);
      expect(result.toNumber()).toBe(25);
    });

    it('should calculate profit margin', () => {
      // Profit of 50 on cost of 200 = 25%
      const result = Money.percentageOf(50, 200);
      expect(result.toNumber()).toBe(25);
    });

    it('should return 0 when whole is 0', () => {
      const result = Money.percentageOf(50, 0);
      expect(result.toNumber()).toBe(0);
    });

    it('should handle decimals', () => {
      const result = Money.percentageOf(33.33, 100);
      expect(result.toNumber()).toBe(33.33);
    });
  });

  describe('precision and rounding', () => {
    it('should use ROUND_HALF_UP by default', () => {
      // Test that Decimal.js is configured correctly
      const result = new Decimal(1.005).toDecimalPlaces(2);
      expect(result.toString()).toBe('1.01'); // Rounds up
    });

    it('should maintain precision for large numbers', () => {
      const result = Money.add(999999999.99, 0.01);
      expect(result.toString()).toBe('1000000000');
    });

    it('should handle very small decimals', () => {
      const result = Money.multiply(0.0001, 0.0001);
      // Decimal.js may use exponential notation for very small numbers
      expect(result.toNumber()).toBeCloseTo(0.00000001, 10);
    });
  });

  describe('BudgetMath helpers', () => {
    it('calculates totals and allocated amounts', () => {
      const total = BudgetMath.calculateTotal([{ amount: 100 }, { amount: 50 }]);
      const allocated = BudgetMath.calculateAllocated([
        { category: 'ops', amount: 60 },
        { category: '', amount: 10 },
        { category: 'capex', amount: 20 },
      ]);

      expect(total.toNumber()).toBe(150);
      expect(allocated.toNumber()).toBe(80);
    });

    it('derives remaining and percentage math', () => {
      const total = decimal(200);
      const allocated = decimal(75.5);
      const remaining = BudgetMath.calculateRemaining(total, allocated);
      const fromPct = BudgetMath.amountFromPercentage(total, 10);
      const pctFromAmount = BudgetMath.percentageFromAmount(50, total);

      expect(remaining.toNumber()).toBeCloseTo(124.5);
      expect(fromPct.toNumber()).toBe(20);
      expect(pctFromAmount.toNumber()).toBe(25);
    });
  });

  describe('InvoiceMath helpers', () => {
    it('computes line amounts, subtotals, tax, and totals', () => {
      const lineAmount = InvoiceMath.calculateLineAmount(3, 19.99);
      const subtotal = InvoiceMath.calculateSubtotal([{ amount: 25 }, { amount: 75 }]);
      const tax = InvoiceMath.calculateTax(subtotal, 15);
      const total = InvoiceMath.calculateTotal(subtotal, tax);

      expect(lineAmount.toFixed(2)).toBe('59.97');
      expect(subtotal.toNumber()).toBe(100);
      expect(tax.toNumber()).toBe(15);
      expect(total.toNumber()).toBe(115);
    });
  });

  describe('PaymentMath.allocatePayment', () => {
    it('allocates payments across invoices without rounding drift', () => {
      const allocations = PaymentMath.allocatePayment(decimal(150), [
        { id: 'a', amount: 100 },
        { id: 'b', amount: 75 },
      ]);

      expect(allocations).toHaveLength(2);
      expect(allocations[0].allocated.toNumber()).toBe(100);
      expect(allocations[1].allocated.toNumber()).toBe(50);
    });
  });

  describe('formatDecimalCurrency', () => {
    it('formats numbers as currency strings', () => {
      const formatted = formatDecimalCurrency(decimal(1234.56), 'USD');
      expect(formatted).toContain('1,234.56');
      expect(
        formatted.startsWith('$') || formatted.includes('USD'),
      ).toBe(true);
    });
  });
});
