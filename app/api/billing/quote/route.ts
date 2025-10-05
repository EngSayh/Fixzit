import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { computeQuote } from '@/lib/pricing';
import { createSecureResponse } from '@/server/security/headers';

export async function POST(req: NextRequest) {
  const input = await req.json(); // {items:[{moduleCode, seatCount?}], billingCycle, seatTotal}
  const q = await computeQuote(input);
  return createSecureResponse(q);
}

