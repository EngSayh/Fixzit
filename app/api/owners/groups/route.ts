import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import OwnerGroup from '@/src/models/OwnerGroup';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get('ownerId');
    
    if (!ownerId) {
      return NextResponse.json(
        { error: 'Owner ID is required' },
        { status: 400 }
      );
    }

    const ownerGroups = await OwnerGroup.find({
      ownerIds: ownerId,
      active: true
    }).sort({ createdAt: -1 });

    return NextResponse.json(ownerGroups);
  } catch (error) {
    console.error('Failed to load owner groups:', error);
    return NextResponse.json(
      { error: 'Failed to load owner groups' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { buildingId, ownerIds, primaryContactUserId, fmVendorId, realEstateAgentId } = body;

    if (!buildingId || !ownerIds || !primaryContactUserId) {
      return NextResponse.json(
        { error: 'Building ID, owner IDs, and primary contact user ID are required' },
        { status: 400 }
      );
    }

    const ownerGroup = await OwnerGroup.create({
      buildingId,
      ownerIds: Array.isArray(ownerIds) ? ownerIds : [ownerIds],
      primaryContactUserId,
      fmVendorId,
      realEstateAgentId,
      active: true
    });

    return NextResponse.json(ownerGroup);
  } catch (error) {
    console.error('Failed to create owner group:', error);
    return NextResponse.json(
      { error: 'Failed to create owner group' },
      { status: 500 }
    );
  }
}