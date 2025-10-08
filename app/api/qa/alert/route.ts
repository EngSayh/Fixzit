import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb-unified';

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

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
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.ip || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    const body = await req.json();
    const { event, data } = body;

    // Log the alert to database
    const native = await getDatabase();
    await native.collection('qa_alerts').insertOne({
      event,
      data,
      timestamp: new Date(),
      ip: req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent'),
    });

    console.warn(`🚨 QA Alert: ${event}`, data);

    return createSecureResponse({ success: true }, 200, req);
  } catch (error) {
    console.error('Failed to process QA alert:', error);
    return createSecureResponse({ error: 'Failed to process alert' }, 500, req);
  }
}

export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.ip || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    const native = await getDatabase();
    const alerts = await native.collection('qa_alerts')
      .find({})
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    return createSecureResponse({ alerts }, 200, req);
  } catch (error) {
    console.error('Failed to fetch QA alerts:', error);
    return createSecureResponse({ error: 'Failed to fetch alerts' }, 500, req);
  }
}
