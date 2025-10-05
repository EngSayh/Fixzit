import { connectToDatabase } from '@/lib/mongodb-unified';
import ServiceContract from '@/server/models/ServiceContract';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { rateLimit } from '@/server/security/rateLimit';
import { createSecureResponse } from '@/server/security/headers';
import { 
  createErrorResponse,
  zodValidationError
} from '@/server/utils/errorResponses';
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
      return createErrorResponse('Authentication required', 401, req);
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return createErrorResponse('Invalid token', 401, req);
    }

    // Role-based access control - only admins can create contracts
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
      return createErrorResponse('Insufficient permissions', 403, req);
    }

    // Rate limiting for contract operations
    const key = `contracts:${(user as any)?.orgId}:${user.id}`;
    const rl = rateLimit(key, 10, 60_000); // 10 contracts per minute
    if (!rl.allowed) {
      return createErrorResponse('Contract creation rate limit exceeded', 429, req);
    }

    await connectToDatabase();
    const body = contractSchema.parse(await req.json());
    
    // Tenant isolation - ensure contract belongs to user's org
    const contractData = {
      ...body,
      orgId: (user as any)?.orgId,
      createdBy: user.id,
      createdAt: new Date()
    };

    const contract = await ServiceContract.create(contractData);
    return createSecureResponse(contract, 201, req);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, req);
    }
    console.error('Contract creation failed:', error);
    return createErrorResponse('Internal server error', 500, req);
  }
}


