import { dbConnect } from '@/src/db/mongoose';
import Benchmark from '@/src/models/Benchmark';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/src/server/middleware/withAuthRbac';

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const user = await getSessionUser(req as any);
    const allowed = ['CORPORATE_ADMIN', 'SUPER_ADMIN', 'ADMIN'];
    if (!allowed.includes(user.role as any)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json(await Benchmark.find({}));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const user = await getSessionUser(req as any);
    const allowed = ['CORPORATE_ADMIN', 'SUPER_ADMIN', 'ADMIN'];
    if (!allowed.includes(user.role as any)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json();
    const doc = await Benchmark.create(body);
    return NextResponse.json(doc);
  } catch (e) {
    const msg = (e as any)?.message || 'Unauthorized';
    if (msg === 'Unauthenticated' || msg === 'Invalid or expired token') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('admin/benchmarks POST error:', e);
    return NextResponse.json({ error: 'Failed to create benchmark' }, { status: 500 });
  }
}
