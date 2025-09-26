import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import PriceTier from '@/src/models/PriceTier';
import Module from '@/src/models/Module';
import { getUserFromToken } from '@/src/lib/auth';
import { z } from 'zod';

const priceTierSchema = z.object({
  moduleCode: z.string().min(1),
  seatsMin: z.number().min(1),
  seatsMax: z.number().min(1),
  pricePerSeatMonthly: z.number().min(0).optional(),
  flatMonthly: z.number().min(0).optional(),
  currency: z.string().min(1).default('USD'),
  region: z.string().optional()
});

async function authenticateAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')?.trim();
  if (!token) {
    throw new Error('Authentication required');
  }

  const user = await getUserFromToken(token);
  if (!user) {
    throw new Error('Invalid token');
  }

  if (!['SUPER_ADMIN'].includes(user.role)) {
    throw new Error('Admin access required');
  }

  return user;
}

export async function GET(req: NextRequest) {
  try {
    await authenticateAdmin(req);
    await dbConnect();
    const rows = await PriceTier.find({}).populate('moduleId','code name');
    return NextResponse.json(rows);
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message === 'Invalid token') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    console.error('Price tier fetch failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateAdmin(req);
    await dbConnect();
    const body = priceTierSchema.parse(await req.json());
    
    // body: { moduleCode, seatsMin, seatsMax, pricePerSeatMonthly, flatMonthly, currency, region }
    const mod = await Module.findOne({ code: body.moduleCode });
    if (!mod) return NextResponse.json({ error: 'MODULE_NOT_FOUND' }, { status: 400 });
    
    const doc = await PriceTier.findOneAndUpdate(
      { moduleId: mod._id, seatsMin: body.seatsMin, seatsMax: body.seatsMax, currency: body.currency || 'USD' },
      { ...body, moduleId: mod._id, updatedBy: user.id, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    return NextResponse.json(doc, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error.message === 'Invalid token') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    console.error('Price tier creation failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
