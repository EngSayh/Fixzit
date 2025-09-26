import { db } from '@/src/lib/mongo';
import Benchmark from '@/src/models/Benchmark';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/src/lib/auth';
import { rateLimit } from '@/src/server/security/rateLimit';
import { z } from 'zod';

const benchmarkSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  value: z.number(),
  unit: z.string().optional(),
  description: z.string().optional()
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
    const benchmarks = await Benchmark.find({});
    return NextResponse.json(benchmarks);
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
    console.error('Benchmark fetch failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateAdmin(req);
    
    // Rate limiting for admin operations
    const key = `admin:benchmarks:${user.id}`;
    const rl = rateLimit(key, 10, 60_000); // 10 requests per minute
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    
    await db;
    const body = benchmarkSchema.parse(await req.json());
    
    const doc = await Benchmark.create({
      ...body,
      createdBy: user.id,
      createdAt: new Date()
    });
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
    console.error('Benchmark creation failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
