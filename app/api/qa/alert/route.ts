import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { getDatabase } from '@/lib/mongodb-unified';
import { getClientIP } from '@/server/security/headers';

import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

type GetDbFn = () => Promise<any>;

async function resolveDatabase() {
  const override = (globalThis as any).__mockGetDatabase as GetDbFn | undefined;
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
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    const body = await req.json();
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

    logger.warn(`🚨 QA Alert: ${event}`, data);

    const successBody = { success: true };
    return createSecureResponse(successBody, 200, req);
  } catch (error) {
    if (process.env.NODE_ENV === 'test') {
      // eslint-disable-next-line no-console
      console.error('[QA alert debug]', error);
    }
    logger.error('Failed to process QA alert:', error instanceof Error ? error.message : 'Unknown error');
    const errorBody = { error: 'Failed to process alert' };
    return createSecureResponse(errorBody, 500, req);
  }
}

export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
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
