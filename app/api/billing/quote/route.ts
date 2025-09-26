import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { computeQuote } from '@/src/lib/pricing';

export async function POST(req: NextRequest) {
  const client = await db;
  const input = await req.json(); // {items:[{moduleCode, seatCount?}], billingCycle, seatTotal}
  const q = await computeQuote(input);
  return NextResponse.json(q);
}
