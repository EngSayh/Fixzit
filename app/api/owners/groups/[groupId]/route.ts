import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import OwnerGroup from '@/src/models/OwnerGroup';

export async function PUT(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { buildingId, ownerIds, primaryContactUserId, fmVendorId, realEstateAgentId } = body;

    const ownerGroup = await OwnerGroup.findByIdAndUpdate(
      params.groupId,
      {
        buildingId,
        ownerIds: Array.isArray(ownerIds) ? ownerIds : [ownerIds],
        primaryContactUserId,
        fmVendorId,
        realEstateAgentId
      },
      { new: true }
    );

    if (!ownerGroup) {
      return NextResponse.json(
        { error: 'Owner group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(ownerGroup);
  } catch (error) {
    console.error('Failed to update owner group:', error);
    return NextResponse.json(
      { error: 'Failed to update owner group' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    await dbConnect();
    
    const ownerGroup = await OwnerGroup.findByIdAndUpdate(
      params.groupId,
      { active: false },
      { new: true }
    );

    if (!ownerGroup) {
      return NextResponse.json(
        { error: 'Owner group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Owner group deactivated successfully' });
  } catch (error) {
    console.error('Failed to delete owner group:', error);
    return NextResponse.json(
      { error: 'Failed to delete owner group' },
      { status: 500 }
    );
  }
}