import PriceBook from '@/server/models/PriceBook';
import DiscountRule from '@/server/models/DiscountRule';

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

export async function quotePrice(opts: {
  priceBookCurrency: 'USD' | 'SAR';
  seats: number;
  modules: string[];
  billingCycle: BillingCycle;
}): Promise<QuoteResult> {
  const { priceBookCurrency, seats, modules, billingCycle } = opts;

  if (seats > 200) {
    return { requiresQuote: true, total: 0, lines: [], annualDiscount: 0 };
  }

  const pb = (await PriceBook.findOne({ currency: priceBookCurrency, active: true }).lean<{
    tiers: Array<{
      min_seats: number;
      max_seats: number;
      discount_pct: number;
      prices: Array<{ module_key: string; monthly_usd: number; monthly_sar: number }>;
    }>;
  }>()) as any;
  if (!pb) {
    throw new Error('PriceBook not found');
  }

  const tier = pb.tiers.find((t) => seats >= t.min_seats && seats <= t.max_seats);
  if (!tier) {
    throw new Error('Tier not found');
  }

  const lines = modules.map((moduleKey) => {
    const priceRow = tier.prices.find((row) => row.module_key === moduleKey);
    if (!priceRow) {
      throw new Error(`No price for module ${moduleKey}`);
    }
    const perSeatMonthly = priceBookCurrency === 'USD' ? priceRow.monthly_usd : priceRow.monthly_sar;
    const discountedPerSeatMonthly = perSeatMonthly * (1 - tier.discount_pct);

    return { module: moduleKey, perSeatMonthly, discountedPerSeatMonthly };
  });

  const subtotalMonthly =
    lines.reduce((total, line) => total + line.discountedPerSeatMonthly, 0) * seats;

  if (billingCycle === 'ANNUAL') {
    const rule = (await DiscountRule.findOne({ key: 'ANNUAL_PREPAY' }).lean<{ percentage?: number }>()) as any;
    const annualDisc = rule?.percentage ?? 0;
    const total = Math.round(subtotalMonthly * 12 * (1 - annualDisc) * 100) / 100;

    return { requiresQuote: false, total, lines, annualDiscount: annualDisc };
  }

  const total = Math.round(subtotalMonthly * 100) / 100;
  return { requiresQuote: false, total, lines };
}

