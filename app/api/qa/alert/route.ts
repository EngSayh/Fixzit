import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { getDatabase, type ConnectionDb } from '@/lib/mongodb-unified';
import { getClientIP } from '@/server/security/headers';

import { smartRateLimit, buildOrgAwareRateLimitKey } from '@/server/security/rateLimit';
import { rateLimitError, unauthorizedError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { requireSuperAdmin } from '@/lib/authz';
import { ensureQaIndexes } from '@/lib/db/collections';

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
  let authContext: { id: string; tenantId: string } | null = null;
  try {
    authContext = await requireSuperAdmin(req);
  } catch (error) {
    // requireSuperAdmin throws Response objects for auth failures
    if (error instanceof Response) {
      return error;
    }
    return unauthorizedError('Authentication failed');
  }

  // SECURITY: Require tenant context for writes to prevent unscoped telemetry
  if (!authContext?.tenantId) {
    return createSecureResponse({ error: 'Missing organization context' }, 400, req);
  }
  const orgId = authContext.tenantId;
  const userId = authContext.id;

  // Rate limiting - SECURITY: Use distributed rate limiting with org isolation
  const key = buildOrgAwareRateLimitKey(req, orgId, userId);
  const rl = await smartRateLimit(key, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  // RELIABILITY: Ensure indexes exist before writes (idempotent, process-level singleton)
  try {
    await ensureQaIndexes();
  } catch (indexError) {
    logger.error('[QA alert] DB unavailable during index bootstrap', {
      error: indexError instanceof Error ? indexError.message : String(indexError ?? ''),
    });
    return createSecureResponse({ error: 'Service temporarily unavailable' }, 503, req);
  }

  // Parse and validate request body
  let body: QaAlertPayload;
  try {
    body = await req.json() as QaAlertPayload;
  } catch {
    return createSecureResponse({ error: 'Invalid JSON body' }, 400, req);
  }
  const { event, data } = body;

  // VALIDATION: Ensure event is a non-empty string (max 128 chars)
  if (!event || typeof event !== 'string' || event.trim().length === 0) {
    return createSecureResponse({ error: 'Event name is required' }, 400, req);
  }
  const sanitizedEvent = event.trim().slice(0, 128);

  // VALIDATION: Cap payload size to prevent storage bloat (10KB max)
  const MAX_PAYLOAD_SIZE = 10 * 1024;
  const dataStr = JSON.stringify(data ?? null);
  if (dataStr.length > MAX_PAYLOAD_SIZE) {
    return createSecureResponse({ error: 'Payload too large (max 10KB)' }, 400, req);
  }

  // Log the alert to database with org tagging for multi-tenant isolation
  try {
    const native = await resolveDatabase();
    await native.collection('qa_alerts').insertOne({
      event: sanitizedEvent,
      data,
      timestamp: new Date(),
      // ORG TAGGING: Include tenant context for multi-tenant isolation
      orgId,
      userId,
      ip: getClientIP(req),
      userAgent: req.headers.get('user-agent'),
    });
  } catch (dbError) {
    logger.error('[QA alert] DB unavailable, cannot persist alert', {
      error: dbError instanceof Error ? dbError.message : String(dbError ?? ''),
    });
    return createSecureResponse({ error: 'Service temporarily unavailable' }, 503, req);
  }

  // Log alert event with redacted payload for observability (no PII leakage)
  const payloadSize = dataStr.length;
  logger.info(`🚨 QA Alert: ${sanitizedEvent}`, { orgId, payloadSize });

  return createSecureResponse({ success: true }, 200, req);
}

export async function GET(req: NextRequest) {
  // SECURITY: Require SUPER_ADMIN to read QA alerts - contains sensitive debugging info
  let authContext: { id: string; tenantId: string } | null = null;
  try {
    authContext = await requireSuperAdmin(req);
  } catch (error) {
    // requireSuperAdmin throws Response objects for auth failures
    if (error instanceof Response) {
      return error;
    }
    return unauthorizedError('Authentication failed');
  }

  // SECURITY: Require tenant context for reads BEFORE rate limiting
  // This ensures we have verified orgId for the rate limit key
  if (!authContext?.tenantId) {
    return createSecureResponse({ error: 'Missing organization context' }, 400, req);
  }
  const orgId = authContext.tenantId;
  const userId = authContext.id;

  // Rate limiting - SECURITY: Use verified orgId for tenant-isolated rate limiting
  const key = buildOrgAwareRateLimitKey(req, orgId, userId);
  const rl = await smartRateLimit(key, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  // RELIABILITY: Ensure indexes exist before reads (guarantees TTL and query perf on cold starts)
  try {
    await ensureQaIndexes();
  } catch (indexError) {
    logger.error('[QA alert] DB unavailable during index bootstrap', {
      error: indexError instanceof Error ? indexError.message : String(indexError ?? ''),
    });
    return createSecureResponse({ error: 'Service temporarily unavailable' }, 503, req);
  }

  try {
    const native = await resolveDatabase();
    // SECURITY: Scope QA alerts to caller's org to prevent cross-tenant data exposure
    // Uses the { orgId: 1, timestamp: -1 } index created by ensureQaIndexes
    const orgFilter = { orgId };
    const alerts = await native.collection('qa_alerts')
      .find(orgFilter)
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    return createSecureResponse({ alerts }, 200, req);
  } catch (error) {
    logger.error('Failed to fetch QA alerts:', error instanceof Error ? error.message : 'Unknown error');
    return createSecureResponse({ error: 'Service temporarily unavailable' }, 503, req);
  }
}
