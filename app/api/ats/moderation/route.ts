import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Job } from '@/server/models/Job';
import { getUserFromToken } from '@/lib/auth';

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

/**
 * @openapi
 * /api/ats/moderation:
 *   get:
 *     summary: ats/moderation operations
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
export async function PUT(req: NextRequest) {
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.ip || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();
    const body = await req.json();
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = token ? await getUserFromToken(token) : null;

    const { jobId, action } = body;
    if (!jobId || !['approve', 'reject'].includes(action)) return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });

    const job = await Job.findById(jobId);
    if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });

    if (action === 'approve') {
      job.status = 'published' as any;
      job.publishedAt = new Date();
      await job.save();
    } else {
      job.status = 'closed' as any;
      await job.save();
    }

    return NextResponse.json({ success: true, data: job });
  } catch (error) {
    console.error('Moderation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to moderate job' }, { status: 500 });
  }
}




