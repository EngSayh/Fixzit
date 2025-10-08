import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/db/mongoose';
import PriceBook from '@/server/models/PriceBook';
import { requireSuperAdmin } from '@/lib/authz';

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await dbConnect();
  await requireSuperAdmin(req);
  const body = await req.json();

  const doc = await PriceBook.findByIdAndUpdate(params.id, body, { new: true });
  if (!doc) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json(doc);
}
