import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import Benchmark from '@/src/db/models/Benchmark';
import { requireSuperAdmin } from '@/src/lib/authz';

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await dbConnect();
  await requireSuperAdmin(req);
  const body = await req.json();

  const doc = await Benchmark.findByIdAndUpdate(params.id, body, { new: true });
  if (!doc) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json(doc);
}
