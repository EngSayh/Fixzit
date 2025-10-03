import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import Benchmark from '@/server/models/Benchmark';
import { requireSuperAdmin } from '@/lib/authz';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  const user = await requireSuperAdmin(req);
  const query = user.role === 'SUPER_ADMIN' ? {} : { tenantId: user.tenantId };
  const docs = await Benchmark.find(query).lean();
  return NextResponse.json(docs);
}
