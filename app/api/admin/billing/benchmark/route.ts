import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import Benchmark from '@/server/models/Benchmark';
import { requireSuperAdmin } from '@/lib/authz';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  await requireSuperAdmin(req);
  const docs = await Benchmark.find({}).lean();
  return NextResponse.json(docs);
}


