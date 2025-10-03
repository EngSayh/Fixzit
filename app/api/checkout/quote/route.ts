import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/db/mongoose';
import { quotePrice } from '@/services/subscription-pricing';

export async function POST(req: NextRequest) {
  await dbConnect();

  const body = await req.json();
  const { seats, modules, billingCycle, currency } = body;

  const seatCount = Number(seats);
  if (!Number.isFinite(seatCount) || seatCount <= 0) {
    return NextResponse.json({ error: 'INVALID_SEAT_COUNT' }, { status: 400 });
  }

  if (!Array.isArray(modules) || modules.length === 0) {
    return NextResponse.json({ error: 'MODULES_REQUIRED' }, { status: 400 });
  }

  const quote = await quotePrice({
    priceBookCurrency: currency ?? 'USD',
    seats: seatCount,
    modules,
    billingCycle: billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY',
  });

  return NextResponse.json(quote);
}

