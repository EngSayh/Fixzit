import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/src/server/middleware/withAuthRbac';
import { dbConnect } from '@/src/db/mongoose';
import PriceTier from '@/src/models/PriceTier';
import Module from '@/src/models/Module';

export async function GET(req: NextRequest) {
  await dbConnect();
  const user = await getSessionUser(req);
  if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const rows = await PriceTier.find({}).populate('moduleId','code name');
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const user = await getSessionUser(req);
  if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  // body: { moduleCode, seatsMin, seatsMax, pricePerSeatMonthly, flatMonthly, currency, region }
  const mod = await Module.findOne({ code: body.moduleCode });
  if (!mod) return NextResponse.json({ error: 'MODULE_NOT_FOUND' }, { status: 400 });
  const doc = await PriceTier.findOneAndUpdate(
    { moduleId: mod._id, seatsMin: body.seatsMin, seatsMax: body.seatsMax, currency: body.currency || 'USD' },
    { ...body, moduleId: mod._id },
    { upsert: true, new: true }
  );
  return NextResponse.json(doc);
}
