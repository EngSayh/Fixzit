import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { Job } from '@/server/models/Job';
import { getUserFromToken } from '@/lib/auth';

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

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
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const params = await props.params;
  try {
    await connectToDatabase();
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = token ? await getUserFromToken(token) : null;
    const userId = user?.id || 'system';
    
    const job = await Job.findById(params.id);
    if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    if (job.status === 'published') return NextResponse.json({ success: false, error: 'Job is already published' }, { status: 400 });
    
    await job.publish();
    return NextResponse.json({ success: true, data: job, message: 'Job published successfully' });
  } catch (error) {
    console.error('Job publish error:', error);
    return NextResponse.json({ success: false, error: 'Failed to publish job' }, { status: 500 });
  }
}


