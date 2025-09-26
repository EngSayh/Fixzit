import { db } from '@/src/lib/mongo';
import Benchmark from '@/src/models/Benchmark';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/src/lib/auth';
import { rateLimit } from '@/src/server/security/rateLimit';
import { createSecureResponse } from '@/src/server/security/headers';
import { createErrorResponse, zodValidationError } from '@/src/server/utils/errorResponses';
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
    return createSecureResponse(benchmarks, 200, req);
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return createErrorResponse('Authentication required', 401, req);
    }
    if (error.message === 'Invalid token') {
      return createErrorResponse('Invalid token', 401, req);
    }
    if (error.message === 'Admin access required') {
      return createErrorResponse('Admin access required', 403, req);
    }
    console.error('Benchmark fetch failed:', error);
    return createErrorResponse('Internal server error', 500, req);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateAdmin(req);
    
    // Rate limiting for admin operations
    const key = `admin:benchmarks:${user.id}`;
    const rl = rateLimit(key, 10, 60_000); // 10 requests per minute
    if (!rl.allowed) {
      return createErrorResponse('Rate limit exceeded', 429, req);
    }
    
    await db;
    const body = benchmarkSchema.parse(await req.json());
    
    const doc = await Benchmark.create({
      ...body,
      createdBy: user.id,
      createdAt: new Date()
    });
    return createSecureResponse(doc, 201, req);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, req);
    }
    if (error.message === 'Authentication required') {
      return createErrorResponse('Authentication required', 401, req);
    }
    if (error.message === 'Invalid token') {
      return createErrorResponse('Invalid token', 401, req);
    }
    if (error.message === 'Admin access required') {
      return createErrorResponse('Admin access required', 403, req);
    }
    console.error('Benchmark creation failed:', error);
    return createErrorResponse('Internal server error', 500, req);
  }
}
