import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import OwnerGroup from '@/src/db/models/OwnerGroup';

export async function POST(req: NextRequest) {
  await dbConnect();
  const { buildingId, ownerIds, primaryContactUserId } = await req.json();

  const groupName = `OwnerGroup-${buildingId}`;
  const group = await OwnerGroup.findOneAndUpdate(
    { name: groupName },
    {
      name: groupName,
      primary_contact_user_id: primaryContactUserId,
      member_user_ids: ownerIds || [],
      property_ids: buildingId ? [buildingId] : [],
    },
    { upsert: true, new: true }
  );

  return NextResponse.json(group);
}
