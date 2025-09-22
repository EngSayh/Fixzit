import Module from '../models/Module';
import PriceTier from '../models/PriceTier';
import DiscountRule from '../models/DiscountRule';

export type QuoteInput = {
  items: { moduleCode: string; seatCount?: number }[];
  billingCycle: 'monthly'|'annual';
  seatTotal: number;
  currency?: string;
};

export async function computeQuote(input: QuoteInput) {
  if (input.seatTotal > 200) {
    return { contactSales: true, reason: 'SEAT_LIMIT_EXCEEDED' };
  }
  const modules = await Module.find({ code: { $in: input.items.map(i => i.moduleCode) }, active: true });
  const tiers   = await PriceTier.find({ moduleId: { $in: modules.map(m => m._id) }, currency: 'USD' });
  const annual  = await DiscountRule.findOne({ code: 'ANNUAL', active: true });

  let monthly = 0;
  const details: any[] = [];
  for (const it of input.items) {
    const mod = modules.find(m => m.code === it.moduleCode)!;
    const seatCount = mod.billingCategory === 'per_tenant' ? 1 : (it.seatCount || input.seatTotal);
    const t = tiers.find(x => x.moduleId.equals(mod._id) && seatCount >= x.seatsMin && seatCount <= x.seatsMax)!;

    const unit = mod.billingCategory === 'per_tenant' ? (t.flatMonthly || 0) : (t.pricePerSeatMonthly || 0);
    const lineMonthly = mod.billingCategory === 'per_tenant' ? unit : unit * seatCount;

    monthly += lineMonthly;
    details.push({ module: mod.code, seatCount, unitPriceMonthly: unit, lineMonthly, billingCategory: mod.billingCategory });
  }

  const annualDiscountPct = input.billingCycle === 'annual' ? (annual?.value || 0) : 0;
  const annualTotal = input.billingCycle === 'annual' ? Math.round(monthly * 12 * (1 - annualDiscountPct/100)) : 0;

  return { seatTotal: input.seatTotal, monthly, annualTotal, annualDiscountPct, items: details, currency: 'USD' };
}
