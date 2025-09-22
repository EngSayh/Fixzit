import { dbConnect } from '@/src/db/mongoose';
import OwnerGroup from '@/src/models/OwnerGroup';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  await dbConnect();
  const { buildingId, ownerIds, primaryContactUserId } = await req.json();
  const g = await OwnerGroup.findOneAndUpdate(
    { buildingId }, { buildingId, ownerIds, primaryContactUserId }, { upsert: true, new: true }
  );
  return NextResponse.json(g);
}
