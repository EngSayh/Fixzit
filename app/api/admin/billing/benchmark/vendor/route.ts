import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import Benchmark from '@/src/db/models/Benchmark';
import { requireSuperAdmin } from '@/src/lib/authz';

export async function POST(req: NextRequest) {
  await dbConnect();
  await requireSuperAdmin(req);
  const body = await req.json();
  const doc = await Benchmark.create(body);
  return NextResponse.json(doc);
}
