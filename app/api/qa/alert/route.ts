import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getDatabase, type ConnectionDb } from '@/lib/mongodb-unified';
import { getClientIP } from '@/server/security/headers';

import { smartRateLimit, buildOrgAwareRateLimitKey } from '@/server/security/rateLimit';
import { rateLimitError, unauthorizedError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { requireSuperAdmin, type AuthContext } from '@/lib/authz';

type GetDbFn = () => Promise<ConnectionDb>;

// VALIDATION: Strict schema for QA alert payloads
const qaAlertSchema = z.object({
  event: z.string().min(1, 'Event name is required').max(128, 'Event name too long'),
  data: z.unknown().optional(),
});

// SECURITY: Max payload size to prevent storage bloat (10KB)
const MAX_PAYLOAD_SIZE = 10 * 1024;

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
  let authContext: AuthContext;
  try {
    authContext = await requireSuperAdmin(req);
  } catch (error) {
    // requireSuperAdmin throws Response objects for auth failures
    if (error instanceof Response) {
      return error;
    }
    return unauthorizedError('Authentication failed');
  }

  // SECURITY: Extract org/user context for attribution and rate limiting
  const orgId = authContext.tenantId || null;
  const userId = authContext.id;

  // Rate limiting - SECURITY: Use org-aware key for proper tenant isolation
  const key = buildOrgAwareRateLimitKey(req, orgId, userId);
  const rl = await smartRateLimit(key, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    // VALIDATION: Parse and validate request body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return createSecureResponse({ error: 'Invalid JSON body' }, 400, req);
    }

    // VALIDATION: Check payload size before processing (use byte length for accurate UTF-8 sizing)
    const bodyStr = JSON.stringify(rawBody);
    const bodyBytes = Buffer.byteLength(bodyStr, 'utf8');
    if (bodyBytes > MAX_PAYLOAD_SIZE) {
      return createSecureResponse({ error: 'Payload too large (max 10KB)' }, 400, req);
    }

    // VALIDATION: Validate against schema
    const parsed = qaAlertSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMessage = parsed.error.issues[0]?.message || 'Invalid alert payload';
      return createSecureResponse({ error: errorMessage }, 400, req);
    }

    const { event, data } = parsed.data;

    // Log the alert to database with org/user attribution for multi-tenant auditing
    const native = await resolveDatabase();
    await native.collection('qa_alerts').insertOne({
      event,
      data: data ?? null,
      timestamp: new Date(),
      // ORG ATTRIBUTION: Required for multi-tenant isolation and audit trails
      orgId,
      userId,
      ip: getClientIP(req),
      userAgent: req.headers.get('user-agent'),
    });

    // Log event for observability (redact data to prevent PII leakage)
    logger.warn(`🚨 QA Alert: ${event}`, { orgId, userId, payloadBytes: bodyBytes });

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
  let authContext: AuthContext;
  try {
    authContext = await requireSuperAdmin(req);
  } catch (error) {
    // requireSuperAdmin throws Response objects for auth failures
    if (error instanceof Response) {
      return error;
    }
    return unauthorizedError('Authentication failed');
  }

  // SECURITY: Extract org/user context for filtering and rate limiting
  const orgId = authContext.tenantId || null;
  const userId = authContext.id;

  // Rate limiting - SECURITY: Use org-aware key for proper tenant isolation
  const key = buildOrgAwareRateLimitKey(req, orgId, userId);
  const rl = await smartRateLimit(key, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    const native = await resolveDatabase();
    
    // ORG SCOPING: Filter alerts by org to prevent cross-tenant data exposure
    // Super-admins without tenantId see all alerts (platform-level debugging)
    const query = orgId ? { orgId } : {};
    
    const alerts = await native.collection('qa_alerts')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    return createSecureResponse({ alerts }, 200, req);
  } catch (error) {
    logger.error('Failed to fetch QA alerts:', error instanceof Error ? error.message : 'Unknown error');
    return createSecureResponse({ error: 'Failed to fetch alerts' }, 500, req);
  }
}
