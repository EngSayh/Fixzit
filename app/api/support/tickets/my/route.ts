import { NextRequest} from "next/server";
import { logger } from '@/lib/logger';
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SupportTicket } from "@/server/models/SupportTicket";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

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
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();
    
    // Handle authentication separately to return 401 instead of 500
    let user;
    try {
      user = await getSessionUser(req);
    } catch (authError) {
      logger.error('Authentication failed:', authError instanceof Error ? authError.message : 'Unknown error');
      return createSecureResponse({ error: 'Unauthorized' }, 401, req);
    }
    
    const items = (await SupportTicket.find({ createdByUserId: user.id }).sort({ createdAt:-1 }).limit(200));
    return createSecureResponse({ items }, 200, req);
  } catch (error) {
    logger.error('My tickets query failed:', error instanceof Error ? error.message : 'Unknown error');
    return createSecureResponse({ error: 'Failed to fetch your tickets' }, 500, req);
  }
}


