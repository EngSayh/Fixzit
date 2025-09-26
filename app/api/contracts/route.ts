import { dbConnect } from '@/src/db/mongoose';
import ServiceContract from '@/src/models/ServiceContract';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/src/lib/auth';
import { z } from 'zod';

const contractSchema = z.object({
  scope: z.enum(['OWNER_GROUP', 'PROPERTY']),
  scopeRef: z.string().min(1),
  contractorType: z.enum(['FM_COMPANY', 'REAL_ESTATE_AGENT']),
  contractorRef: z.string().min(1),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  terms: z.string().min(1),
  sla: z.record(z.string(), z.any()).optional()
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

    // Role-based access control - only admins can create contracts
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await dbConnect();
    const body = contractSchema.parse(await req.json());
    
    // Tenant isolation - ensure contract belongs to user's org
    const contractData = {
      ...body,
      orgId: user.tenantId,
      createdBy: user.id,
      createdAt: new Date()
    };

    const contract = await ServiceContract.create(contractData);
    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Contract creation failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
