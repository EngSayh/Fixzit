import { dbConnect } from '@/src/db/mongoose';
import Benchmark from '@/src/models/Benchmark';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  await dbConnect(); return NextResponse.json(await Benchmark.find({}));
}
export async function POST(req: NextRequest) {
  await dbConnect(); const body = await req.json();
  const doc = await Benchmark.create(body);
  return NextResponse.json(doc);
}
