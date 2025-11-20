import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { Job } from '@/server/models/Job';
import { atsRBAC, canAccessResource } from '@/lib/ats/rbac';

import { rateLimit } from '@/server/security/rateLimit';
import {notFoundError, validationError, rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

/**
 * @openapi
 * /api/ats/jobs/[id]/publish:
 *   get:
 *     summary: ats/jobs/[id]/publish operations
 *     tags: [ats]
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
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const params = await props.params;
  try {
    await connectToDatabase();
    
    // RBAC: Check permissions
    const authResult = await atsRBAC(req, ['jobs:publish']);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const { orgId, isSuperAdmin } = authResult;
    
    const job = await Job.findById(params.id);
    if (!job) return notFoundError("Job");
    
    // Resource ownership check
    if (!canAccessResource(orgId, job.orgId, isSuperAdmin)) {
      return notFoundError("Job");
    };
    if (job.status === 'published') return validationError("Job is already published");
    
    await job.publish();
    return NextResponse.json({ success: true, data: job, message: 'Job published successfully' });
  } catch (error) {
    logger.error('Job publish error:', error instanceof Error ? error.message : 'Unknown error');
    return createSecureResponse({ error: "Failed to publish job" }, 500, req);
  }
}


