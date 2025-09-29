import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import Benchmark from '@/src/db/models/Benchmark';
import { requireSuperAdmin } from '@/src/lib/authz';

export async function GET(req: NextRequest) {
  await dbConnect();
  await requireSuperAdmin(req);
  const docs = await Benchmark.find({}).lean();
  return NextResponse.json(docs);
}
