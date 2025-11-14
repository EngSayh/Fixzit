import { connectToDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import ServiceContract from '@/server/models/ServiceContract';
import { NextRequest } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { rateLimit } from '@/server/security/rateLimit';
import { createSecureResponse } from '@/server/security/headers';
import { 
  createErrorResponse,
  zodValidationError,
  rateLimitError
} from '@/server/utils/errorResponses';
import { z } from 'zod';
import { getClientIP } from '@/server/security/headers';

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

/**
 * @openapi
 * /api/contracts:
 *   get:
 *     summary: contracts operations
 *     tags: [contracts]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

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

    // Ensure user has tenant context
    if (!user.orgId) {
      return createErrorResponse('User organization not found', 400, req);
    }

    // Role-based access control - only admins can create contracts
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
      return createErrorResponse('Insufficient permissions', 403, req);
    }

    // Rate limiting for contract operations
    const key = `contracts:${user.orgId}:${user.id}`;
    const rl = rateLimit(key, 10, 60_000); // 10 contracts per minute
    if (!rl.allowed) {
      return createErrorResponse('Contract creation rate limit exceeded', 429, req);
    }

    await connectToDatabase();
    const body = contractSchema.parse(await req.json());
    
    // Tenant isolation - ensure contract belongs to user's org
    const contractData = {
      ...body,
      orgId: user.orgId,
      createdBy: user.id,
      createdAt: new Date()
    };

    // @ts-ignore - Mongoose type inference issue with conditional model export
    const contract = (await ServiceContract.create(contractData)) as any;
    return createSecureResponse(contract, 201, req);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, req);
    }
    logger.error('Contract creation failed:', error instanceof Error ? error.message : 'Unknown error');
    return createErrorResponse('Internal server error', 500, req);
  }
}




