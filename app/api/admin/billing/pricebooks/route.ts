import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/db/mongoose';
import PriceBook from '@/server/models/PriceBook';
import { requireSuperAdmin } from '@/lib/authz';

export async function POST(req: NextRequest) {
  await dbConnect();
  await requireSuperAdmin(req);
  const body = await req.json();

  const doc = await PriceBook.create(body);
  return NextResponse.json(doc);
}


