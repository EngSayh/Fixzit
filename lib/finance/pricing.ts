import PriceBook from '@/server/models/PriceBook';
import DiscountRule from '@/server/models/DiscountRule';
import { z, type ZodIssue } from 'zod';

export type BillingCycle = 'MONTHLY' | 'ANNUAL';

export type QuoteLine = {
  module: string;
  perSeatMonthly: number;
  discountedPerSeatMonthly: number;
};

export type QuoteResult =
  | { requiresQuote: true; total: 0; lines: []; annualDiscount?: number }
  | {
      requiresQuote: false;
      total: number;
      lines: QuoteLine[];
      annualDiscount?: number;
    };

// Type definitions for better type safety
interface PriceRowType {
  module_key: string;
  monthly_usd: number;
  monthly_sar: number;
}

interface TierType {
  min_seats: number;
  max_seats: number;
  discount_pct: number;
  prices: PriceRowType[];
}

interface PriceBookDoc {
  tiers: TierType[];
}

interface DiscountRuleDoc {
  percentage?: number;
}

// Custom error class for pricing-related errors
export class PricingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PricingError';
  }
}

// Input validation schema
const quotePriceSchema = z.object({
  priceBookCurrency: z.enum(['USD', 'SAR']),
  seats: z.number().positive().int().min(1).max(10000),
  modules: z.array(z.string()).min(1),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL']),
});

export async function quotePrice(opts: {
  priceBookCurrency: 'USD' | 'SAR';
  seats: number;
  modules: string[];
  billingCycle: BillingCycle;
}): Promise<QuoteResult> {
  // Validate input parameters
  const validation = quotePriceSchema.safeParse(opts);
  if (!validation.success) {
    const issueMessages = validation.error.issues
      .map((issue: ZodIssue) => issue.message)
      .join(', ');
    throw new PricingError(
      `Invalid pricing parameters: ${issueMessages}`,
      'INVALID_INPUT',
      { errors: validation.error.issues }
    );
  }

  const { priceBookCurrency, seats, modules, billingCycle } = opts;

  // Handle enterprise quotes
  if (seats > 200) {
    return { requiresQuote: true, total: 0, lines: [], annualDiscount: 0 };
  }

  // Parallel query optimization: fetch price book and discount rule simultaneously
  const [pb, rule] = await Promise.all([
    PriceBook.findOne({ currency: priceBookCurrency, active: true }).lean<PriceBookDoc>(),
    billingCycle === 'ANNUAL' 
      ? DiscountRule.findOne({ key: 'ANNUAL_PREPAY' }).lean<DiscountRuleDoc>()
      : Promise.resolve(null),
  ]);

  if (!pb) {
    throw new PricingError(
      `No active price book found for currency ${priceBookCurrency}`,
      'PRICEBOOK_NOT_FOUND',
      { currency: priceBookCurrency }
    );
  }

  const tier = pb.tiers.find((t: TierType) => seats >= t.min_seats && seats <= t.max_seats);
  
  if (!tier) {
    throw new PricingError(
      `No pricing tier found for ${seats} seats`,
      'TIER_NOT_FOUND',
      { seats, availableTiers: pb.tiers.map((t: TierType) => ({ min: t.min_seats, max: t.max_seats })) }
    );
  }

  // Build quote lines with proper type safety
  const lines = modules.map((moduleKey: string) => {
    const priceRow = tier.prices.find((row: PriceRowType) => row.module_key === moduleKey);
    
    if (!priceRow) {
      throw new PricingError(
        `No price found for module '${moduleKey}'`,
        'MODULE_NOT_FOUND',
        { module: moduleKey, availableModules: tier.prices.map((p: PriceRowType) => p.module_key) }
      );
    }
    
    const perSeatMonthly = priceBookCurrency === 'USD' ? priceRow.monthly_usd : priceRow.monthly_sar;
    const discountedPerSeatMonthly = perSeatMonthly * (1 - tier.discount_pct);

    return { module: moduleKey, perSeatMonthly, discountedPerSeatMonthly };
  });

  const subtotalMonthly =
    lines.reduce((total: number, line) => total + line.discountedPerSeatMonthly, 0) * seats;

  // Calculate annual pricing with discount
  if (billingCycle === 'ANNUAL') {
    const annualDisc = rule?.percentage ?? 0;
    const total = Math.round(subtotalMonthly * 12 * (1 - annualDisc) * 100) / 100;

    return { requiresQuote: false, total, lines, annualDiscount: annualDisc };
  }

  // Calculate monthly pricing
  const total = Math.round(subtotalMonthly * 100) / 100;
  return { requiresQuote: false, total, lines };
}
