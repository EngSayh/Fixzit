import { dbConnect } from '@/src/db/mongoose'; import DiscountRule from '@/src/models/DiscountRule';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/src/server/middleware/withAuthRbac';

export async function GET(req: NextRequest) {
  await dbConnect(); const user = await getSessionUser(req);
  if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const d = await DiscountRule.findOne({ code: 'ANNUAL' });
  return NextResponse.json(d || { code:'ANNUAL', value:0, active:false });
}
export async function PUT(req: NextRequest) {
  await dbConnect(); const user = await getSessionUser(req);
  if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const d = await DiscountRule.findOneAndUpdate({ code: 'ANNUAL' },
    { code:'ANNUAL', type: 'percent', value: body.value, active: true }, { upsert: true, new: true });
  return NextResponse.json(d);
}
