import { dbConnect } from '@/src/db/mongoose';
import DiscountRule from '@/src/models/DiscountRule';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  // Handle static generation
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({
      code: 'ANNUAL',
      value: 0,
      active: false,
      message: 'Static generation mode'
    });
  }

  await dbConnect(); const d = await DiscountRule.findOne({ code: 'ANNUAL' });
  return NextResponse.json(d || { code:'ANNUAL', value:0, active:false });
}
export async function PUT(req: NextRequest) {
  await dbConnect(); const body = await req.json();
  const d = await DiscountRule.findOneAndUpdate({ code: 'ANNUAL' },
    { code:'ANNUAL', type: 'percent', value: body.value, active: true }, { upsert: true, new: true });
  return NextResponse.json(d);
}
