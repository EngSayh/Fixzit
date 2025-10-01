import { NextRequest, NextResponse } from 'next/server';
import Benchmark from '@/src/server/models/Benchmark';
import { computeQuote } from '@/lib/pricing';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { z } from 'zod';

const compareSchema = z.object({
  seatTotal: z.number().positive(),
  billingCycle: z.enum(['monthly', 'annual']),
  items: z.array(z.object({
    moduleCode: z.string().min(1)
  }))
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = compareSchema.parse(await req.json());
    
    const ours = computeQuote({
      items: body.items,
      seatTotal: body.seatTotal,
      billingCycle: body.billingCycle
    }) as any;
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
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Benchmark comparison failed:', error);
    return NextResponse.json({ error: 'Failed to compare benchmarks' }, { status: 500 });
  }
}


