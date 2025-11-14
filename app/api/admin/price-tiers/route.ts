import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb-unified';
import PriceTier from '@/server/models/PriceTier';
import Module from '@/server/models/Module';
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

/**
 * @openapi
 * /api/admin/price-tiers:
 *   get:
 *     summary: admin/price-tiers operations
 *     tags: [admin]
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
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 100, 60000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await authenticateAdmin(req);
    await connectToDatabase();
    // @ts-ignore - Mongoose type inference issue with conditional model export
    const rows = await PriceTier.find({}).populate('moduleId','code name') as any;
    return createSecureResponse(rows, 200, req);
  } catch (error: unknown) {
    // Check for specific authentication errors
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return createErrorResponse('Authentication required', 401);
      }
      if (error.message === 'Invalid token') {
        return createErrorResponse('Invalid token', 401);
      }
      if (error.message === 'Admin access required') {
        return createErrorResponse('Admin access required', 403);
      }
    }
    logger.error('Price tier fetch failed:', error instanceof Error ? error.message : 'Unknown error');
    return createErrorResponse('Internal server error', 500);
  }
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 100, 60000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    const user = await authenticateAdmin(req);
    
    // Rate limiting for admin operations
    const key = `admin:price-tiers:${user.id}`;
    const rl = rateLimit(key, 20, 60_000); // 20 requests per minute
    if (!rl.allowed) {
      return createErrorResponse('Rate limit exceeded', 429, req);
    }
    
    await connectToDatabase();
    const body = priceTierSchema.parse(await req.json());
    
    // body: { moduleCode, seatsMin, seatsMax, pricePerSeatMonthly, flatMonthly, currency, region }
    // @ts-ignore - Mongoose type inference issue with conditional model export
    const mod = await Module.findOne({ code: body.moduleCode }) as any;
    if (!mod) return createErrorResponse('MODULE_NOT_FOUND', 400, req);
    
    // @ts-ignore - Mongoose type inference issue with conditional model export
    const doc = await PriceTier.findOneAndUpdate(
      { moduleId: mod._id, seatsMin: body.seatsMin, seatsMax: body.seatsMax, currency: body.currency || 'USD' },
      { ...body, moduleId: mod._id, updatedBy: user.id, updatedAt: new Date() },
      { upsert: true, new: true }
    ) as any;
    return createSecureResponse(doc, 201, req);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error);
    }
    // Check for specific authentication errors
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return createErrorResponse('Authentication required', 401);
      }
      if (error.message === 'Invalid token') {
        return createErrorResponse('Invalid token', 401);
      }
      if (error.message === 'Admin access required') {
        return createErrorResponse('Admin access required', 403);
      }
    }
    logger.error('Price tier creation failed:', error instanceof Error ? error.message : 'Unknown error');
    return createErrorResponse('Internal server error', 500);
  }
}



