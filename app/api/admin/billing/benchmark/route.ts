import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/src/lib/mongodb-unified';
import Benchmark from '@/src/db/models/Benchmark';
import { requireSuperAdmin } from '@/src/lib/authz';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  await requireSuperAdmin(req);
  const docs = await Benchmark.find({}).lean();
  return NextResponse.json(docs);
}

