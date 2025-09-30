import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/src/lib/mongodb-unified';
import { computeQuote } from '@/src/lib/pricing';
import { createSecureResponse } from '@/src/server/security/headers';

export async function POST(req: NextRequest) {
  const input = await req.json(); // {items:[{moduleCode, seatCount?}], billingCycle, seatTotal}
  const q = await computeQuote(input);
  return createSecureResponse(q);
}

