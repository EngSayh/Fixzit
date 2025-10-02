import { connectToDatabase } from '@/lib/mongodb-unified';
import OwnerGroup from '@/server/models/OwnerGroup';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { z } from 'zod';

const assignPrimarySchema = z.object({
  buildingId: z.string().min(1),
  ownerIds: z.array(z.string()),
  primaryContactUserId: z.string().min(1)
});

export async function POST(req: NextRequest) {
  try {
    // Authentication & Authorization
    const token = req.headers.get('authorization')?.replace('Bearer ', '')?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Role-based access control - only property admins can assign owner groups
    if (!['SUPER_ADMIN', 'ADMIN', 'PROPERTY_ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to manage owner groups' }, { status: 403 });
    }

    await connectToDatabase();
    const body = assignPrimarySchema.parse(await req.json());
    
    // Tenant isolation - ensure group belongs to user's org
    const g = await OwnerGroup.findOneAndUpdate(
      { buildingId: body.buildingId, orgId: (user as any)?.orgId }, 
      { 
        buildingId: body.buildingId, 
        ownerIds: body.ownerIds, 
        primaryContactUserId: body.primaryContactUserId,
        orgId: (user as any)?.orgId,
        updatedBy: user.id,
        updatedAt: new Date()
      }, 
      { upsert: true, new: true }
    );
    return NextResponse.json(g, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Owner group assignment failed:', error);
    return NextResponse.json({ error: 'Failed to assign owner group' }, { status: 500 });
  }
}



