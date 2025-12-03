import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { getDatabase, type ConnectionDb } from '@/lib/mongodb-unified';
import { getClientIP } from '@/server/security/headers';

import { smartRateLimit, buildOrgAwareRateLimitKey } from '@/server/security/rateLimit';
import { rateLimitError, unauthorizedError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { requireSuperAdmin } from '@/lib/authz';

type GetDbFn = () => Promise<ConnectionDb>;
type QaAlertPayload = { event: string; data: unknown };

async function resolveDatabase() {
  const mock = (globalThis as Record<string, unknown>).__mockGetDatabase;
  const override = typeof mock === 'function' ? (mock as GetDbFn) : undefined;
  if (typeof override === 'function') {
    return override();
  }
  return getDatabase();
}

/**
 * @openapi
 * /api/qa/alert:
 *   get:
 *     summary: qa/alert operations
 *     tags: [qa]
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
  // SECURITY: Require SUPER_ADMIN to write QA alerts - prevents abuse and spam
  try {
    await requireSuperAdmin(req);
  } catch (error) {
    // requireSuperAdmin throws Response objects for auth failures
    if (error instanceof Response) {
      return error;
    }
    return unauthorizedError('Authentication failed');
  }

  // Rate limiting - SECURITY: Use distributed rate limiting to prevent cross-instance bypass
  const key = buildOrgAwareRateLimitKey(req, null, null);
  const rl = await smartRateLimit(key, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    const body = await req.json() as QaAlertPayload;
    const { event, data } = body;

    // Log the alert to database
    const native = await resolveDatabase();
    await native.collection('qa_alerts').insertOne({
      event,
      data,
      timestamp: new Date(),
      ip: getClientIP(req),
      userAgent: req.headers.get('user-agent'),
    });

    // Log minimal payload for observability (flatten for easier inspection)
    logger.warn(`🚨 QA Alert: ${event}`, { payload: data });

    const successBody = { success: true };
    return createSecureResponse(successBody, 200, req);
  } catch (error) {
    if (process.env.NODE_ENV === 'test') {
      logger.error('[QA alert debug]', error);
    }
    logger.error('Failed to process QA alert:', error instanceof Error ? error.message : 'Unknown error');
    const errorBody = { error: 'Failed to process alert' };
    return createSecureResponse(errorBody, 500, req);
  }
}

export async function GET(req: NextRequest) {
  // SECURITY: Require SUPER_ADMIN to read QA alerts - contains sensitive debugging info
  try {
    await requireSuperAdmin(req);
  } catch (error) {
    // requireSuperAdmin throws Response objects for auth failures
    if (error instanceof Response) {
      return error;
    }
    return unauthorizedError('Authentication failed');
  }

  // Rate limiting - SECURITY: Use distributed rate limiting to prevent cross-instance bypass
  const key = buildOrgAwareRateLimitKey(req, null, null);
  const rl = await smartRateLimit(key, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    const native = await resolveDatabase();
    const alerts = await native.collection('qa_alerts')
      .find({})
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    return createSecureResponse({ alerts }, 200, req);
  } catch (error) {
    logger.error('Failed to fetch QA alerts:', error instanceof Error ? error.message : 'Unknown error');
    return createSecureResponse({ error: 'Failed to fetch alerts' }, 500, req);
  }
}
