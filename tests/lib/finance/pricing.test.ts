/**
 * Unit tests for pricing service
 * Tests: quotePrice, PricingError, Zod validation, tier selection, discount calculations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { quotePrice, PricingError } from '@/lib/finance/pricing';
import PriceBook from '@/server/models/PriceBook';
import DiscountRule from '@/server/models/DiscountRule';

const TEST_ORG_ID = new mongoose.Types.ObjectId();
const CREATOR_ID = new mongoose.Types.ObjectId();

describe('Pricing Service Unit Tests', () => {
  let priceBookId: mongoose.Types.ObjectId;
  let discountRuleId: mongoose.Types.ObjectId;
  const seedPriceBooks = async () => {
    const priceBook = await PriceBook.create({
      name: 'USD Price Book',
      createdBy: CREATOR_ID,
      orgId: TEST_ORG_ID,
      currency: 'USD',
      active: true,
      tiers: [
        {
          min_seats: 1,
          max_seats: 10,
          discount_pct: 0,
          prices: [
            { module_key: 'AQAR', monthly_usd: 50, monthly_sar: 187.5 },
            { module_key: 'FM', monthly_usd: 40, monthly_sar: 150 },
            { module_key: 'HR', monthly_usd: 30, monthly_sar: 112.5 },
          ],
        },
        {
          min_seats: 11,
          max_seats: 50,
          discount_pct: 0.1, // 10% discount
          prices: [
            { module_key: 'AQAR', monthly_usd: 50, monthly_sar: 187.5 },
            { module_key: 'FM', monthly_usd: 40, monthly_sar: 150 },
            { module_key: 'HR', monthly_usd: 30, monthly_sar: 112.5 },
          ],
        },
        {
          min_seats: 51,
          max_seats: 200,
          discount_pct: 0.2, // 20% discount
          prices: [
            { module_key: 'AQAR', monthly_usd: 50, monthly_sar: 187.5 },
            { module_key: 'FM', monthly_usd: 40, monthly_sar: 150 },
            { module_key: 'HR', monthly_usd: 30, monthly_sar: 112.5 },
          ],
        },
      ],
    });
    priceBookId = priceBook._id as mongoose.Types.ObjectId;

    await PriceBook.create({
      name: 'SAR Price Book',
      createdBy: CREATOR_ID,
      orgId: TEST_ORG_ID,
      currency: 'SAR',
      active: true,
      tiers: [
        {
          min_seats: 1,
          max_seats: 10,
          discount_pct: 0,
          prices: [
            { module_key: 'AQAR', monthly_usd: 50, monthly_sar: 187.5 },
            { module_key: 'FM', monthly_usd: 40, monthly_sar: 150 },
          ],
        },
      ],
    });

    const discountRule = await DiscountRule.create({
      orgId: TEST_ORG_ID,
      createdBy: CREATOR_ID,
      key: 'ANNUAL_PREPAY',
      percentage: 0.15, // 15% discount for annual prepayment
      active: true,
    });
    discountRuleId = discountRule._id as mongoose.Types.ObjectId;
  };

  beforeAll(async () => {
    // Connect to test database (reuse existing connection if available)
    if (mongoose.connection.readyState === 0) {
      const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit-test';
      await mongoose.connect(MONGODB_URI);
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await PriceBook.deleteMany({ orgId: TEST_ORG_ID });
    await DiscountRule.deleteMany({ orgId: TEST_ORG_ID });
    // Don't disconnect - let vitest.setup handle it
    // await mongoose.disconnect();
  });

  beforeEach(() => {
    // Clear any mocks
    vi.clearAllMocks();
    return seedPriceBooks();
  });

  describe('Input Validation', () => {
    it('should reject invalid currency', async () => {
      await expect(
        quotePrice({
          priceBookCurrency: 'EUR' as any,
          seats: 5,
          modules: ['AQAR'],
          billingCycle: 'MONTHLY',
        })
      ).rejects.toThrow(PricingError);
    });

    it('should reject negative seats', async () => {
      await expect(
        quotePrice({
          priceBookCurrency: 'USD',
          seats: -5,
          modules: ['AQAR'],
          billingCycle: 'MONTHLY',
        })
      ).rejects.toThrow(PricingError);

      try {
        await quotePrice({
          priceBookCurrency: 'USD',
          seats: -5,
          modules: ['AQAR'],
          billingCycle: 'MONTHLY',
        });
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(PricingError);
        const pricingError = error as PricingError;
        expect(pricingError.code).toBe('INVALID_INPUT');
        expect(pricingError.message).toContain('Invalid pricing parameters');
      }
    });

    it('should reject zero seats', async () => {
      await expect(
        quotePrice({
          priceBookCurrency: 'USD',
          seats: 0,
          modules: ['AQAR'],
          billingCycle: 'MONTHLY',
        })
      ).rejects.toThrow(PricingError);
    });

    it('should reject seats exceeding 10,000', async () => {
      await expect(
        quotePrice({
          priceBookCurrency: 'USD',
          seats: 10001,
          modules: ['AQAR'],
          billingCycle: 'MONTHLY',
        })
      ).rejects.toThrow(PricingError);
    });

    it('should reject empty modules array', async () => {
      await expect(
        quotePrice({
          priceBookCurrency: 'USD',
          seats: 5,
          modules: [],
          billingCycle: 'MONTHLY',
        })
      ).rejects.toThrow(PricingError);
    });

    it('should reject invalid billing cycle', async () => {
      await expect(
        quotePrice({
          priceBookCurrency: 'USD',
          seats: 5,
          modules: ['AQAR'],
          billingCycle: 'QUARTERLY' as any,
        })
      ).rejects.toThrow(PricingError);
    });

    it('should reject non-integer seats', async () => {
      await expect(
        quotePrice({
          priceBookCurrency: 'USD',
          seats: 5.5,
          modules: ['AQAR'],
          billingCycle: 'MONTHLY',
        })
      ).rejects.toThrow(PricingError);
    });
  });

  describe('Enterprise Quotes', () => {
    it('should require quote for >200 seats', async () => {
      const result = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 201,
        modules: ['AQAR', 'FM'],
        billingCycle: 'MONTHLY',
      });

      expect(result.requiresQuote).toBe(true);
      expect(result.total).toBe(0);
      expect(result.lines).toEqual([]);
    });

    it('should require quote for exactly 201 seats', async () => {
      const result = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 201,
        modules: ['AQAR'],
        billingCycle: 'ANNUAL',
      });

      expect(result.requiresQuote).toBe(true);
      expect(result.annualDiscount).toBe(0);
    });

    it('should require quote for 1000 seats', async () => {
      const result = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 1000,
        modules: ['AQAR', 'FM', 'HR'],
        billingCycle: 'MONTHLY',
      });

      expect(result.requiresQuote).toBe(true);
    });
  });

  describe('Tier Selection', () => {
    it('should select tier 1 for 5 seats', async () => {
      const result = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 5,
        modules: ['AQAR'],
        billingCycle: 'MONTHLY',
      });

      expect(result.requiresQuote).toBe(false);
      // Tier 1: 0% discount, AQAR = $50/seat
      // Total = 5 seats * $50 = $250
      expect(result.total).toBe(250);
    });

    it('should select tier 1 for exactly 10 seats (upper boundary)', async () => {
      const result = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 10,
        modules: ['FM'],
        billingCycle: 'MONTHLY',
      });

      expect(result.requiresQuote).toBe(false);
      // Tier 1: 0% discount, FM = $40/seat
      // Total = 10 seats * $40 = $400
      expect(result.total).toBe(400);
    });

    it('should select tier 2 for 11 seats (lower boundary)', async () => {
      const result = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 11,
        modules: ['AQAR'],
        billingCycle: 'MONTHLY',
      });

      expect(result.requiresQuote).toBe(false);
      // Tier 2: 10% discount, AQAR = $50/seat
      // Discounted price = $50 * 0.9 = $45/seat
      // Total = 11 seats * $45 = $495
      expect(result.total).toBe(495);
    });

    it('should select tier 2 for 25 seats (mid-range)', async () => {
      const result = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 25,
        modules: ['HR'],
        billingCycle: 'MONTHLY',
      });

      expect(result.requiresQuote).toBe(false);
      // Tier 2: 10% discount, HR = $30/seat
      // Discounted price = $30 * 0.9 = $27/seat
      // Total = 25 seats * $27 = $675
      expect(result.total).toBe(675);
    });

    it('should select tier 3 for 51 seats (lower boundary)', async () => {
      const result = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 51,
        modules: ['FM'],
        billingCycle: 'MONTHLY',
      });

      expect(result.requiresQuote).toBe(false);
      // Tier 3: 20% discount, FM = $40/seat
      // Discounted price = $40 * 0.8 = $32/seat
      // Total = 51 seats * $32 = $1,632
      expect(result.total).toBe(1632);
    });

    it('should select tier 3 for 200 seats (upper boundary)', async () => {
      const result = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 200,
        modules: ['AQAR'],
        billingCycle: 'MONTHLY',
      });

      expect(result.requiresQuote).toBe(false);
      // Tier 3: 20% discount, AQAR = $50/seat
      // Discounted price = $50 * 0.8 = $40/seat
      // Total = 200 seats * $40 = $8,000
      expect(result.total).toBe(8000);
    });

    it('should throw error for seats outside all tiers', async () => {
      // Create price book with gap (no tier for 11-20 seats)
      await PriceBook.updateMany({ currency: 'SAR' }, { active: false });
      await PriceBook.create({
        orgId: TEST_ORG_ID,
        name: 'SAR Gap Price Book',
        createdBy: CREATOR_ID,
        currency: 'SAR',
        active: true,
        tiers: [
          {
            min_seats: 1,
            max_seats: 10,
            discount_pct: 0,
            prices: [{ module_key: 'TEST', monthly_usd: 10, monthly_sar: 37.5 }],
          },
          {
            min_seats: 21,
            max_seats: 50,
            discount_pct: 0,
            prices: [{ module_key: 'TEST', monthly_usd: 10, monthly_sar: 37.5 }],
          },
        ],
      });

      try {
        await quotePrice({
          priceBookCurrency: 'SAR',
          seats: 15, // Falls in gap
          modules: ['TEST'],
          billingCycle: 'MONTHLY',
        });
        throw new Error('Should have thrown PricingError');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(PricingError);
        const pricingError = error as PricingError;
        expect(pricingError.code).toBe('TIER_NOT_FOUND');
        expect(pricingError.details?.seats).toBe(15);
        expect(pricingError.details?.availableTiers).toBeDefined();
      }
    });
  });

  describe('Multi-Module Pricing', () => {
    it('should calculate total for multiple modules', async () => {
      const result = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 5,
        modules: ['AQAR', 'FM', 'HR'],
        billingCycle: 'MONTHLY',
      });

      expect(result.requiresQuote).toBe(false);
      expect(result.lines).toHaveLength(3);
      
      // Tier 1: 0% discount
      // AQAR: $50/seat, FM: $40/seat, HR: $30/seat
      // Total per seat = $50 + $40 + $30 = $120
      // Total = 5 seats * $120 = $600
      expect(result.total).toBe(600);

      // Verify individual line items
      const aqarLine = result.lines.find(l => l.module === 'AQAR');
      const fmLine = result.lines.find(l => l.module === 'FM');
      const hrLine = result.lines.find(l => l.module === 'HR');

      expect(aqarLine?.perSeatMonthly).toBe(50);
      expect(aqarLine?.discountedPerSeatMonthly).toBe(50);
      
      expect(fmLine?.perSeatMonthly).toBe(40);
      expect(fmLine?.discountedPerSeatMonthly).toBe(40);
      
      expect(hrLine?.perSeatMonthly).toBe(30);
      expect(hrLine?.discountedPerSeatMonthly).toBe(30);
    });

    it('should apply tier discount to all modules', async () => {
      const result = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 25,
        modules: ['AQAR', 'FM'],
        billingCycle: 'MONTHLY',
      });

      expect(result.requiresQuote).toBe(false);
      
      // Tier 2: 10% discount
      // AQAR: $50 * 0.9 = $45/seat, FM: $40 * 0.9 = $36/seat
      // Total per seat = $45 + $36 = $81
      // Total = 25 seats * $81 = $2,025
      expect(result.total).toBe(2025);

      const aqarLine = result.lines.find(l => l.module === 'AQAR');
      const fmLine = result.lines.find(l => l.module === 'FM');

      expect(aqarLine?.discountedPerSeatMonthly).toBe(45);
      expect(fmLine?.discountedPerSeatMonthly).toBe(36);
    });

    it('should throw error for non-existent module', async () => {
      try {
        await quotePrice({
          priceBookCurrency: 'USD',
          seats: 5,
          modules: ['AQAR', 'NONEXISTENT'],
          billingCycle: 'MONTHLY',
        });
        throw new Error('Should have thrown PricingError');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(PricingError);
        const pricingError = error as PricingError;
        expect(pricingError.code).toBe('MODULE_NOT_FOUND');
        expect(pricingError.details?.module).toBe('NONEXISTENT');
        expect(pricingError.details?.availableModules).toEqual(['AQAR', 'FM', 'HR']);
      }
    });
  });

  describe('Annual Billing & Discounts', () => {
    it('should apply annual discount for ANNUAL billing', async () => {
      const result = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 5,
        modules: ['AQAR'],
        billingCycle: 'ANNUAL',
      });

      expect(result.requiresQuote).toBe(false);
      
      // Monthly: 5 seats * $50 = $250
      // Annual before discount: $250 * 12 = $3,000
      // Annual discount: 15%
      // Final: $3,000 * 0.85 = $2,550
      expect(result.total).toBe(2550);
      expect(result.annualDiscount).toBe(0.15);
    });

    it('should not apply annual discount for MONTHLY billing', async () => {
      const result = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 5,
        modules: ['AQAR'],
        billingCycle: 'MONTHLY',
      });

      expect(result.requiresQuote).toBe(false);
      expect(result.total).toBe(250);
      expect(result.annualDiscount).toBeUndefined();
    });

    it('should combine tier discount + annual discount correctly', async () => {
      const result = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 25,
        modules: ['FM'],
        billingCycle: 'ANNUAL',
      });

      expect(result.requiresQuote).toBe(false);
      
      // Tier 2: 10% discount
      // FM: $40 * 0.9 = $36/seat
      // Monthly: 25 seats * $36 = $900
      // Annual before annual discount: $900 * 12 = $10,800
      // Annual discount: 15%
      // Final: $10,800 * 0.85 = $9,180
      expect(result.total).toBe(9180);
      expect(result.annualDiscount).toBe(0.15);
    });

    it('should handle missing annual discount rule gracefully', async () => {
      // Delete the discount rule temporarily
      await DiscountRule.deleteMany({ key: 'ANNUAL_PREPAY' });

      const result = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 5,
        modules: ['AQAR'],
        billingCycle: 'ANNUAL',
      });

      // Should still work, just without discount
      expect(result.requiresQuote).toBe(false);
      // Monthly: $250, Annual: $250 * 12 = $3,000 (no discount)
      expect(result.total).toBe(3000);
      expect(result.annualDiscount).toBe(0);

      // Restore discount rule
      await DiscountRule.create({
        orgId: TEST_ORG_ID,
        createdBy: CREATOR_ID,
        key: 'ANNUAL_PREPAY',
        percentage: 0.15,
        active: true,
      });
    });
  });

  describe('Currency Support', () => {
    it('should calculate pricing in SAR', async () => {
      const result = await quotePrice({
        priceBookCurrency: 'SAR',
        seats: 5,
        modules: ['AQAR'],
        billingCycle: 'MONTHLY',
      });

      expect(result.requiresQuote).toBe(false);
      // AQAR SAR price: 187.5/seat
      // Total = 5 seats * 187.5 = 937.5
      expect(result.total).toBe(937.5);
    });

    it('should use correct currency pricing from tier', async () => {
      const usdResult = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 5,
        modules: ['FM'],
        billingCycle: 'MONTHLY',
      });

      const sarResult = await quotePrice({
        priceBookCurrency: 'SAR',
        seats: 5,
        modules: ['FM'],
        billingCycle: 'MONTHLY',
      });

      // USD: $40/seat, SAR: 150/seat
      expect(usdResult.total).toBe(200); // 5 * $40
      expect(sarResult.total).toBe(750); // 5 * 150 SAR
    });

    it('should throw error for inactive price book', async () => {
      // Deactivate USD price book
      await PriceBook.updateMany({ currency: 'USD' }, { active: false });

      try {
        await quotePrice({
          priceBookCurrency: 'USD',
          seats: 5,
          modules: ['AQAR'],
          billingCycle: 'MONTHLY',
        });
        throw new Error('Should have thrown PricingError');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(PricingError);
        const pricingError = error as PricingError;
        expect(pricingError.code).toBe('PRICEBOOK_NOT_FOUND');
        expect(pricingError.details?.currency).toBe('USD');
      }

      // Reactivate for other tests
      await PriceBook.updateOne(
        { currency: 'USD', orgId: TEST_ORG_ID },
        { active: true }
      );
    });

    it('should throw error for non-existent currency', async () => {
      try {
        await quotePrice({
          priceBookCurrency: 'GBP' as any,
          seats: 5,
          modules: ['AQAR'],
          billingCycle: 'MONTHLY',
        });
        throw new Error('Should have thrown PricingError');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(PricingError);
        const pricingError = error as PricingError;
        expect(pricingError.code).toBe('INVALID_INPUT');
      }
    });
  });

  describe('Edge Cases & Rounding', () => {
    it('should round totals to 2 decimal places', async () => {
      const result = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 3,
        modules: ['HR'],
        billingCycle: 'MONTHLY',
      });

      // HR: $30/seat * 3 seats = $90.00
      expect(result.total).toBe(90);
      expect(Number.isInteger(result.total * 100)).toBe(true); // Verify cents precision
    });

    it('should handle complex rounding with discounts', async () => {
      const result = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 25,
        modules: ['AQAR', 'FM', 'HR'],
        billingCycle: 'ANNUAL',
      });

      // Tier 2: 10% discount
      // AQAR: $50 * 0.9 = $45, FM: $40 * 0.9 = $36, HR: $30 * 0.9 = $27
      // Per seat: $45 + $36 + $27 = $108
      // Monthly: 25 * $108 = $2,700
      // Annual: $2,700 * 12 = $32,400
      // Annual discount (15%): $32,400 * 0.85 = $27,540
      expect(result.total).toBe(27540);
    });

    it('should handle minimum valid input (1 seat, 1 module)', async () => {
      const result = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 1,
        modules: ['AQAR'],
        billingCycle: 'MONTHLY',
      });

      expect(result.requiresQuote).toBe(false);
      expect(result.total).toBe(50); // 1 seat * $50
      expect(result.lines).toHaveLength(1);
    });

    it('should handle maximum seats before enterprise quote (200)', async () => {
      const result = await quotePrice({
        priceBookCurrency: 'USD',
        seats: 200,
        modules: ['AQAR'],
        billingCycle: 'MONTHLY',
      });

      expect(result.requiresQuote).toBe(false);
      // Tier 3: 20% discount, AQAR = $50 * 0.8 = $40/seat
      // Total = 200 * $40 = $8,000
      expect(result.total).toBe(8000);
    });
  });

  describe('PricingError Structure', () => {
    it('should include error code and details in validation errors', async () => {
      try {
        await quotePrice({
          priceBookCurrency: 'USD',
          seats: -10,
          modules: [],
          billingCycle: 'INVALID' as any,
        });
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(PricingError);
        const pricingError = error as PricingError;
        expect(pricingError.name).toBe('PricingError');
        expect(pricingError.code).toBe('INVALID_INPUT');
        expect(pricingError.message).toContain('Invalid pricing parameters');
        const details = pricingError.details as { errors?: unknown[] } | undefined;
        expect(details).toBeDefined();
        expect(Array.isArray(details?.errors)).toBe(true);
        expect((details?.errors ?? []).length).toBeGreaterThan(0);
      }
    });

    it('should provide actionable error messages', async () => {
      try {
        await quotePrice({
          priceBookCurrency: 'USD',
          seats: 5,
          modules: ['NONEXISTENT_MODULE'],
          billingCycle: 'MONTHLY',
        });
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(PricingError);
        const pricingError = error as PricingError;
        expect(pricingError.message).toContain('NONEXISTENT_MODULE');
        expect(pricingError.details?.module).toBe('NONEXISTENT_MODULE');
        expect(pricingError.details?.availableModules).toBeInstanceOf(Array);
        // Error should tell user what modules ARE available
        expect(pricingError.details?.availableModules).toContain('AQAR');
      }
    });
  });

  describe('Performance & Parallel Queries', () => {
    it('should only query discount rule for annual billing', async () => {
      // Spy on DiscountRule queries
      const findOneSpy = vi.spyOn(DiscountRule, 'findOne');

      // Monthly billing - should NOT query discount rule
      await quotePrice({
        priceBookCurrency: 'USD',
        seats: 5,
        modules: ['AQAR'],
        billingCycle: 'MONTHLY',
      });

      // Note: The implementation uses Promise.resolve(null) for MONTHLY,
      // so findOne won't be called at all for monthly billing
      expect(findOneSpy).not.toHaveBeenCalled();

      findOneSpy.mockClear();

      // Annual billing - SHOULD query discount rule
      await quotePrice({
        priceBookCurrency: 'USD',
        seats: 5,
        modules: ['AQAR'],
        billingCycle: 'ANNUAL',
      });

      expect(findOneSpy).toHaveBeenCalledTimes(1);
      expect(findOneSpy).toHaveBeenCalledWith({ key: 'ANNUAL_PREPAY' });

      findOneSpy.mockRestore();
    });

    it('should execute PriceBook and DiscountRule queries in parallel', async () => {
      const pbSpy = vi.spyOn(PriceBook, 'findOne');
      const drSpy = vi.spyOn(DiscountRule, 'findOne');

      await quotePrice({
        priceBookCurrency: 'USD',
        seats: 5,
        modules: ['AQAR'],
        billingCycle: 'ANNUAL',
      });

      // Both should be called (via Promise.all)
      expect(pbSpy).toHaveBeenCalledTimes(1);
      expect(drSpy).toHaveBeenCalledTimes(1);

      pbSpy.mockRestore();
      drSpy.mockRestore();
    });
  });
});
