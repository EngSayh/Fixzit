import { dbConnect } from '@/src/db/mongoose';
import Benchmark from '@/src/models/Benchmark';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/src/server/middleware/withAuthRbac';

export async function GET(req: NextRequest) {
  await dbConnect(); const user = await getSessionUser(req);
  if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await Benchmark.find({}));
}
export async function POST(req: NextRequest) {
  await dbConnect(); const user = await getSessionUser(req);
  if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const doc = await Benchmark.create(body);
  return NextResponse.json(doc);
}
