import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import { computeQuote } from '@/src/lib/pricing';

export async function POST(req: NextRequest) {
  await dbConnect();
  const input = await req.json(); // {items:[{moduleCode, seatCount?}], billingCycle, seatTotal}
  const q = await computeQuote(input);
  return NextResponse.json(q);
}
