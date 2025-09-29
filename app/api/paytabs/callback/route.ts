import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import { finalizePayTabsTransaction, normalizePayTabsPayload } from '@/src/services/paytabs';

export async function POST(req: NextRequest) {
  await dbConnect();
  const payload = await req.json();
  const normalized = normalizePayTabsPayload(payload);

  try {
    const result = await finalizePayTabsTransaction(normalized);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
