/**
 * Finance Module - Decimal Math Utilities
 * Provides precise money calculations using Decimal.js
 * Avoids floating-point errors in financial calculations
 */

import Decimal from "decimal.js";

// Configure Decimal.js for currency (2 decimal places)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Create a Decimal instance from various input types
 */
export function decimal(
  value: number | string | Decimal | null | undefined,
): Decimal {
  if (value === "" || value == null) {
    return new Decimal(0);
  }
  return new Decimal(value);
}

/**
 * Money Math Operations
 */
export const Money = {
  /**
   * Add two or more monetary values
   */
  add(...values: (number | string | Decimal)[]): Decimal {
    return values.reduce<Decimal>(
      (sum, val) => sum.plus(decimal(val)),
      decimal(0),
    );
  },

  /**
   * Subtract monetary values
   */
  subtract(
    a: number | string | Decimal,
    b: number | string | Decimal,
  ): Decimal {
    return decimal(a).minus(decimal(b));
  },

  /**
   * Multiply a monetary value (e.g., quantity × rate)
   */
  multiply(
    a: number | string | Decimal,
    b: number | string | Decimal,
  ): Decimal {
    return decimal(a).times(decimal(b));
  },

  /**
   * Divide monetary values
   */
  divide(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    const divisor = decimal(b);
    if (divisor.isZero()) {
      throw new RangeError(
        `Division by zero attempted with dividend: ${a} and divisor: ${b}`,
      );
    }
    return decimal(a).dividedBy(divisor);
  },

  /**
   * Calculate percentage of an amount
   * @param amount - Base amount
   * @param percentage - Percentage (0-100)
   */
  percentage(
    amount: number | string | Decimal,
    percentage: number | string | Decimal,
  ): Decimal {
    return decimal(amount).times(decimal(percentage)).dividedBy(100);
  },

  /**
   * Calculate what percentage one amount is of another
   * @param part - The part amount
   * @param whole - The whole amount
   * @returns Percentage (0-100)
   */
  percentageOf(
    part: number | string | Decimal,
    whole: number | string | Decimal,
  ): Decimal {
    const wholeDec = decimal(whole);
    if (wholeDec.isZero()) {
      return decimal(0);
    }
    return decimal(part).dividedBy(wholeDec).times(100);
  },

  /**
   * Round to 2 decimal places (standard for currency)
   */
  round(value: number | string | Decimal): Decimal {
    return decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  },

  /**
   * Convert Decimal to number (for storage/display)
   */
  toNumber(value: Decimal): number {
    return value.toNumber();
  },

  /**
   * Convert Decimal to fixed string (e.g., "123.45")
   */
  toString(value: Decimal, decimalPlaces = 2): string {
    return value.toFixed(decimalPlaces);
  },

  /**
   * Check if value is zero
   */
  isZero(value: number | string | Decimal): boolean {
    return decimal(value).isZero();
  },

  /**
   * Check if value is positive
   */
  isPositive(value: number | string | Decimal): boolean {
    return decimal(value).isPositive();
  },

  /**
   * Check if value is negative
   */
  isNegative(value: number | string | Decimal): boolean {
    return decimal(value).isNegative();
  },

  /**
   * Compare two values
   * @returns -1 if a < b, 0 if a === b, 1 if a > b
   */
  compare(a: number | string | Decimal, b: number | string | Decimal): number {
    return decimal(a).comparedTo(decimal(b));
  },

  /**
   * Get the absolute value
   */
  abs(value: number | string | Decimal): Decimal {
    return decimal(value).abs();
  },

  /**
   * Calculate sum of an array of values
   */
  sum(values: (number | string | Decimal)[]): Decimal {
    return values.reduce<Decimal>(
      (sum, val) => sum.plus(decimal(val)),
      decimal(0),
    );
  },

  /**
   * Calculate average of an array of values
   */
  average(values: (number | string | Decimal)[]): Decimal {
    if (values.length === 0) return decimal(0);
    return Money.sum(values).dividedBy(values.length);
  },

  /**
   * Get minimum value from array
   */
  min(...values: (number | string | Decimal)[]): Decimal {
    if (values.length === 0) return decimal(0);
    return Decimal.min(...values.map((v) => decimal(v)));
  },

  /**
   * Get maximum value from array
   */
  max(...values: (number | string | Decimal)[]): Decimal {
    if (values.length === 0) return decimal(0);
    return Decimal.max(...values.map((v) => decimal(v)));
  },
};

/**
 * Budget calculations
 */
export const BudgetMath = {
  /**
   * Calculate total budget from categories
   */
  calculateTotal(categories: Array<{ amount: number }>): Decimal {
    return Money.sum(categories.map((c) => c.amount));
  },

  /**
   * Calculate allocated budget (categories with non-empty names)
   */
  calculateAllocated(
    categories: Array<{ category: string; amount: number }>,
  ): Decimal {
    return Money.sum(
      categories.filter((c) => c.category.trim()).map((c) => c.amount),
    );
  },

  /**
   * Calculate remaining budget
   */
  calculateRemaining(total: Decimal, allocated: Decimal): Decimal {
    return total.minus(allocated);
  },

  /**
   * Update category amount from percentage
   */
  amountFromPercentage(total: Decimal, percentage: number): Decimal {
    return Money.percentage(total, percentage);
  },

  /**
   * Update category percentage from amount
   */
  percentageFromAmount(amount: number, total: Decimal): Decimal {
    return Money.percentageOf(amount, total);
  },
};

/**
 * Invoice calculations
 */
export const InvoiceMath = {
  /**
   * Calculate line item amount (quantity × rate)
   */
  calculateLineAmount(quantity: number, rate: number): Decimal {
    return Money.multiply(quantity, rate);
  },

  /**
   * Calculate subtotal from line items
   */
  calculateSubtotal(lineItems: Array<{ amount: number }>): Decimal {
    return Money.sum(lineItems.map((item) => item.amount));
  },

  /**
   * Calculate tax amount
   */
  calculateTax(subtotal: Decimal, taxRate: number): Decimal {
    return Money.percentage(subtotal, taxRate);
  },

  /**
   * Calculate total (subtotal + tax)
   */
  calculateTotal(subtotal: Decimal, taxAmount: Decimal): Decimal {
    return subtotal.plus(taxAmount);
  },
};

/**
 * Payment calculations
 */
export const PaymentMath = {
  /**
   * Calculate payment allocation across invoices
   */
  allocatePayment(
    totalPayment: Decimal,
    invoices: Array<{ id: string; amount: number }>,
  ): Array<{ id: string; allocated: Decimal }> {
    const allocations: Array<{ id: string; allocated: Decimal }> = [];
    let remaining = totalPayment;

    for (const invoice of invoices) {
      if (remaining.isZero() || remaining.isNegative()) break;

      const invoiceAmount = decimal(invoice.amount);
      const allocated = Decimal.min(remaining, invoiceAmount);
      const roundedAllocated = Money.round(allocated);

      allocations.push({
        id: invoice.id,
        allocated: roundedAllocated,
      });

      // Subtract the rounded value to prevent rounding drift
      remaining = remaining.minus(roundedAllocated);
    }

    return allocations;
  },
};

/**
 * Format a Decimal value as currency string
 */
export function formatDecimalCurrency(
  value: Decimal,
  currency = "OMR",
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Money.toNumber(value));
}
