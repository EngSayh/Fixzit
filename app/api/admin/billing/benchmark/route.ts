import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import Benchmark from '@/server/models/Benchmark';
import { requireSuperAdmin } from '@/lib/authz';

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

/**
 * @openapi
 * /api/admin/billing/benchmark:
 *   get:
 *     summary: admin/billing/benchmark operations
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
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 100, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  await connectToDatabase();
  await requireSuperAdmin(req);
  const docs = await Benchmark.find({}).lean();
  return createSecureResponse(docs, 200, req);
}



