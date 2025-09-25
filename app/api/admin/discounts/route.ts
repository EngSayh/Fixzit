import { NextRequest, NextResponse } from 'next/server';

import { dbConnect } from '@/src/db/mongoose';
import DiscountRule from '@/src/models/DiscountRule';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await dbConnect();
  const discount = await DiscountRule.findOne({ code: 'ANNUAL' });

  return NextResponse.json(
    discount || { code: 'ANNUAL', value: 0, active: false }
  );
}

export async function PUT(req: NextRequest) {
  await dbConnect();
  const body = await req.json();

  const discount = await DiscountRule.findOneAndUpdate(
    { code: 'ANNUAL' },
    { code: 'ANNUAL', type: 'percent', value: body.value, active: true },
    { upsert: true, new: true }
  );

  return NextResponse.json(discount);
}
