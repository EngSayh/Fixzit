import { db } from '@/src/lib/mongo';
import DiscountRule from '@/src/models/DiscountRule';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/src/lib/auth';
import { rateLimit } from '@/src/server/security/rateLimit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const discountSchema = z.object({
  value: z.number().min(0).max(100)
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
    await db;
    const d = await DiscountRule.findOne({ code: 'ANNUAL' });
    return NextResponse.json(d || { code:'ANNUAL', value:0, active:false });
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
    console.error('Discount fetch failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await authenticateAdmin(req);
    
    // Rate limiting for admin operations
    const key = `admin:discounts:${user.id}`;
    const rl = rateLimit(key, 5, 60_000); // 5 requests per minute for discount changes
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    
    await db;
    const body = discountSchema.parse(await req.json());
    
    const d = await DiscountRule.findOneAndUpdate({ code: 'ANNUAL' },
      { code:'ANNUAL', type: 'percent', value: body.value, active: true, updatedBy: user.id, updatedAt: new Date() }, 
      { upsert: true, new: true });
    return NextResponse.json(d);
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
    console.error('Discount update failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
