import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import Benchmark from '@/src/db/models/Benchmark';
import { quotePrice } from '@/src/services/pricing';

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();

  const modules = body.modules || body.items?.map((item: any) => item.moduleCode);
  const seats = Number(body.seats ?? body.seatTotal);
  const billingCycle = body.billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
  const currency = body.currency ?? 'USD';

  if (!Array.isArray(modules) || modules.length === 0) {
    return NextResponse.json({ error: 'MODULES_REQUIRED' }, { status: 400 });
  }

  const quote = await quotePrice({
    priceBookCurrency: currency,
    seats,
    modules,
    billingCycle,
  });

  if (quote.requiresQuote) {
    return NextResponse.json(quote);
  }

  const vendors = await Benchmark.find({}).lean();
  const perSeatPrices = vendors.flatMap((vendor: any) =>
    (vendor.plans || [])
      .map((plan: any) => plan.price_per_user_month_usd)
      .filter((price: any) => typeof price === 'number')
  );

  perSeatPrices.sort((a, b) => a - b);
  const medianIndex = Math.floor(perSeatPrices.length / 2);
  const medianPrice = perSeatPrices.length ? perSeatPrices[medianIndex] : 0;
  const marketMonthly = medianPrice * seats;
  const diff = quote.total - marketMonthly;

  return NextResponse.json({
    ours: {
      total: quote.total,
      billingCycle,
      lines: quote.lines,
      annualDiscount: quote.annualDiscount,
    },
    market: {
      perUserMedianMonthly: medianPrice,
      teamMonthly: marketMonthly,
    },
    position: diff === 0 ? 'PAR' : diff < 0 ? 'BELOW_MARKET' : 'ABOVE_MARKET',
  });
}
