import { NextRequest, NextResponse } from 'next/server';
import Benchmark from '@/src/models/Benchmark';
import { computeQuote } from '@/src/lib/pricing';
import { dbConnect } from '@/src/db/mongoose';

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json(); // { seatTotal, billingCycle, items:[{moduleCode}] }
  const ours = await computeQuote(body) as any;
  if (ours.contactSales) return NextResponse.json(ours);

  const rows = await Benchmark.find({});
  const perUserRows = rows.filter(r => r.pricingModel==='per_user_month' && r.priceMonthly);
  const monthlyMedian = perUserRows.sort((a,b)=>a.priceMonthly-b.priceMonthly)[Math.floor(perUserRows.length/2)]?.priceMonthly || 0;

  const compMonthly = monthlyMedian * body.seatTotal; // FM core-like proxy
  const diff = ours.monthly - compMonthly;
  return NextResponse.json({
    ours: { monthly: ours.monthly, annualTotal: ours.annualTotal, items: ours.items },
    market: { perUserMedianMonthly: monthlyMedian, teamMonthly: compMonthly },
    position: diff === 0 ? 'PAR' : diff < 0 ? 'BELOW_MARKET' : 'ABOVE_MARKET'
  });
}
