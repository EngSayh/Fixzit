export const dynamic = 'force-dynamic';
import { db } from '@/src/lib/mongo';
import DiscountRule from '@/src/models/DiscountRule';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  await db; const d = await (DiscountRule as any).findOne?.({ code: 'ANNUAL' });
  return NextResponse.json(d || { code:'ANNUAL', value:0, active:false });
}
export async function PUT(req: NextRequest) {
  await db; const body = await req.json();
  const d = await (DiscountRule as any).findOneAndUpdate?.({ code: 'ANNUAL' },
    { code:'ANNUAL', type: 'percent', value: body.value, active: true }, { upsert: true, new: true });
  return NextResponse.json(d);
}
