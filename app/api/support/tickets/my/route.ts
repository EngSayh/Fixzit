import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SupportTicket } from "@/server/models/SupportTicket";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * @openapi
 * /api/support/tickets/my:
 *   get:
 *     summary: support/tickets/my operations
 *     tags: [support]
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
export async function GET(req: NextRequest){
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.ip || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  await connectToDatabase();
  const user = await getSessionUser(req);
  const items = await (SupportTicket as any).find({ createdByUserId: user.id }).sort({ createdAt:-1 }).limit(200);
  return createSecureResponse({ items }, 200, req);
}


